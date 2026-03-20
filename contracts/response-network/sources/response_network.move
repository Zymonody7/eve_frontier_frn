module response_network::response_network {
    use std::string;
    use std::string::String;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    #[test_only]
    use sui::test_scenario;

    const STATUS_OPEN: u8 = 0;
    const STATUS_ACCEPTED: u8 = 1;
    const STATUS_IN_PROGRESS: u8 = 2;
    const STATUS_AWAITING_CONFIRMATION: u8 = 3;
    const STATUS_COMPLETED: u8 = 4;
    const STATUS_CANCELLED: u8 = 5;

    const NULL_ADDRESS: address = @0x0;

    const E_EMPTY_TITLE: u64 = 0;
    const E_EMPTY_DESCRIPTION: u64 = 1;
    const E_EMPTY_REWARD: u64 = 2;
    const E_INVALID_DEADLINE: u64 = 3;
    const E_REQUEST_NOT_OPEN: u64 = 4;
    const E_REQUESTER_CANNOT_ACCEPT: u64 = 5;
    const E_REQUEST_ALREADY_ASSIGNED: u64 = 6;
    const E_ONLY_RESPONDER: u64 = 7;
    const E_ONLY_REQUESTER: u64 = 8;
    const E_REQUEST_NOT_ACCEPTED: u64 = 9;
    const E_REQUEST_NOT_ACTIVE: u64 = 10;
    const E_REQUEST_NOT_AWAITING_CONFIRMATION: u64 = 11;
    const E_REQUEST_HAS_NO_RESPONDER: u64 = 12;

    public struct Registry has key {
        id: sui::object::UID,
        total_requests: u64,
    }

    public struct RescueRequest has key {
        id: sui::object::UID,
        registry_id: sui::object::ID,
        requester: address,
        responder: address,
        title: String,
        start_system: String,
        hazard_level: String,
        description: String,
        deadline_ms: u64,
        reward: Balance<SUI>,
        reward_mist: u64,
        status: u8,
        needs_fuel: bool,
        needs_escort_home: bool,
        created_at_ms: u64,
        updated_at_ms: u64,
    }

    public struct RegistryCreated has copy, drop {
        registry_id: sui::object::ID,
    }

    public struct RequestCreated has copy, drop {
        request_id: sui::object::ID,
        registry_id: sui::object::ID,
        requester: address,
        reward_mist: u64,
        deadline_ms: u64,
        needs_fuel: bool,
        needs_escort_home: bool,
    }

    public struct RequestStatusChanged has copy, drop {
        request_id: sui::object::ID,
        actor: address,
        status: u8,
    }

    public struct RequestSettled has copy, drop {
        request_id: sui::object::ID,
        recipient: address,
        reward_mist: u64,
        refunded: bool,
    }

    fun init(ctx: &mut sui::tx_context::TxContext) {
        let registry = Registry {
            id: sui::object::new(ctx),
            total_requests: 0,
        };

        event::emit(RegistryCreated {
            registry_id: sui::object::id(&registry),
        });

        sui::transfer::share_object(registry);
    }

    public fun create_request(
        registry: &mut Registry,
        reward: Coin<SUI>,
        title: String,
        start_system: String,
        hazard_level: String,
        description: String,
        deadline_ms: u64,
        needs_fuel: bool,
        needs_escort_home: bool,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        assert!(string::length(&title) > 0, E_EMPTY_TITLE);
        assert!(string::length(&description) > 0, E_EMPTY_DESCRIPTION);

        let now_ms = sui::tx_context::epoch_timestamp_ms(ctx);
        assert!(deadline_ms > now_ms, E_INVALID_DEADLINE);

        let reward_balance = coin::into_balance(reward);
        let reward_mist = balance::value(&reward_balance);
        assert!(reward_mist > 0, E_EMPTY_REWARD);

        registry.total_requests = registry.total_requests + 1;

        let request = RescueRequest {
            id: sui::object::new(ctx),
            registry_id: sui::object::id(registry),
            requester: sui::tx_context::sender(ctx),
            responder: NULL_ADDRESS,
            title,
            start_system,
            hazard_level,
            description,
            deadline_ms,
            reward: reward_balance,
            reward_mist,
            status: STATUS_OPEN,
            needs_fuel,
            needs_escort_home,
            created_at_ms: now_ms,
            updated_at_ms: now_ms,
        };

        event::emit(RequestCreated {
            request_id: sui::object::id(&request),
            registry_id: sui::object::id(registry),
            requester: request.requester,
            reward_mist,
            deadline_ms,
            needs_fuel,
            needs_escort_home,
        });

        sui::transfer::share_object(request);
    }

    public fun accept_request(request: &mut RescueRequest, ctx: &sui::tx_context::TxContext) {
        let actor = sui::tx_context::sender(ctx);

        assert!(request.status == STATUS_OPEN, E_REQUEST_NOT_OPEN);
        assert!(request.requester != actor, E_REQUESTER_CANNOT_ACCEPT);
        assert!(request.responder == NULL_ADDRESS, E_REQUEST_ALREADY_ASSIGNED);

        request.responder = actor;
        set_status(request, STATUS_ACCEPTED, actor, sui::tx_context::epoch_timestamp_ms(ctx));
    }

    public fun mark_in_progress(request: &mut RescueRequest, ctx: &sui::tx_context::TxContext) {
        let actor = sui::tx_context::sender(ctx);

        assert!(request.responder == actor, E_ONLY_RESPONDER);
        assert!(request.status == STATUS_ACCEPTED, E_REQUEST_NOT_ACCEPTED);

        set_status(request, STATUS_IN_PROGRESS, actor, sui::tx_context::epoch_timestamp_ms(ctx));
    }

    public fun mark_awaiting_confirmation(
        request: &mut RescueRequest,
        ctx: &sui::tx_context::TxContext,
    ) {
        let actor = sui::tx_context::sender(ctx);

        assert!(request.responder == actor, E_ONLY_RESPONDER);
        assert!(
            request.status == STATUS_ACCEPTED || request.status == STATUS_IN_PROGRESS,
            E_REQUEST_NOT_ACTIVE,
        );

        set_status(
            request,
            STATUS_AWAITING_CONFIRMATION,
            actor,
            sui::tx_context::epoch_timestamp_ms(ctx),
        );
    }

    public fun confirm_completion(
        request: &mut RescueRequest,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let actor = sui::tx_context::sender(ctx);

        assert!(request.requester == actor, E_ONLY_REQUESTER);
        assert!(
            request.status == STATUS_AWAITING_CONFIRMATION,
            E_REQUEST_NOT_AWAITING_CONFIRMATION,
        );
        assert!(request.responder != NULL_ADDRESS, E_REQUEST_HAS_NO_RESPONDER);

        let payout_balance = balance::withdraw_all(&mut request.reward);
        let payout_mist = balance::value(&payout_balance);
        let payout = coin::from_balance(payout_balance, ctx);

        set_status(
            request,
            STATUS_COMPLETED,
            actor,
            sui::tx_context::epoch_timestamp_ms(ctx),
        );

        event::emit(RequestSettled {
            request_id: sui::object::id(request),
            recipient: request.responder,
            reward_mist: payout_mist,
            refunded: false,
        });

        sui::transfer::public_transfer(payout, request.responder);
    }

    public fun cancel_open_request(
        request: &mut RescueRequest,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let actor = sui::tx_context::sender(ctx);

        assert!(request.requester == actor, E_ONLY_REQUESTER);
        assert!(request.status == STATUS_OPEN, E_REQUEST_NOT_OPEN);

        let refund_balance = balance::withdraw_all(&mut request.reward);
        let refund_mist = balance::value(&refund_balance);
        let refund = coin::from_balance(refund_balance, ctx);

        set_status(
            request,
            STATUS_CANCELLED,
            actor,
            sui::tx_context::epoch_timestamp_ms(ctx),
        );

        event::emit(RequestSettled {
            request_id: sui::object::id(request),
            recipient: request.requester,
            reward_mist: refund_mist,
            refunded: true,
        });

        sui::transfer::public_transfer(refund, request.requester);
    }

    public fun registry_id(registry: &Registry): sui::object::ID {
        sui::object::id(registry)
    }

    public fun total_requests(registry: &Registry): u64 {
        registry.total_requests
    }

    public fun request_id(request: &RescueRequest): sui::object::ID {
        sui::object::id(request)
    }

    public fun request_status(request: &RescueRequest): u8 {
        request.status
    }

    public fun request_reward_mist(request: &RescueRequest): u64 {
        request.reward_mist
    }

    public fun request_requester(request: &RescueRequest): address {
        request.requester
    }

    public fun request_responder(request: &RescueRequest): address {
        request.responder
    }

    fun set_status(request: &mut RescueRequest, status: u8, actor: address, now_ms: u64) {
        request.status = status;
        request.updated_at_ms = now_ms;

        event::emit(RequestStatusChanged {
            request_id: sui::object::id(request),
            actor,
            status,
        });
    }

    #[test]
    fun complete_rescue_flow() {
        let requester = @0xa;
        let responder = @0xb;
        let mut scenario = test_scenario::begin(requester);

        {
            init(scenario.ctx());
        };

        scenario.next_tx(requester);
        {
            let mut registry = scenario.take_shared<Registry>();
            let reward = coin::mint_for_testing<SUI>(100, scenario.ctx());
            create_request(
                &mut registry,
                reward,
                b"Fuel rescue".to_string(),
                b"Nomad's Wake".to_string(),
                b"high".to_string(),
                b"Need fuel and escort".to_string(),
                10_000,
                true,
                true,
                scenario.ctx(),
            );
            test_scenario::return_shared(registry);
        };

        scenario.next_tx(responder);
        {
            let mut request = scenario.take_shared<RescueRequest>();
            assert!(request.status == STATUS_OPEN);
            accept_request(&mut request, scenario.ctx());
            assert!(request.status == STATUS_ACCEPTED);
            test_scenario::return_shared(request);
        };

        scenario.next_tx(responder);
        {
            let mut request = scenario.take_shared<RescueRequest>();
            mark_in_progress(&mut request, scenario.ctx());
            assert!(request.status == STATUS_IN_PROGRESS);
            test_scenario::return_shared(request);
        };

        scenario.next_tx(responder);
        {
            let mut request = scenario.take_shared<RescueRequest>();
            mark_awaiting_confirmation(&mut request, scenario.ctx());
            assert!(request.status == STATUS_AWAITING_CONFIRMATION);
            test_scenario::return_shared(request);
        };

        scenario.next_tx(requester);
        {
            let mut request = scenario.take_shared<RescueRequest>();
            confirm_completion(&mut request, scenario.ctx());
            assert!(request.status == STATUS_COMPLETED);
            test_scenario::return_shared(request);
        };

        scenario.next_tx(responder);
        {
            let payout = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::burn_for_testing(payout) == 100);
        };

        scenario.end();
    }

    #[test]
    fun cancel_request_refunds_requester() {
        let requester = @0xc;
        let mut scenario = test_scenario::begin(requester);

        {
            init(scenario.ctx());
        };

        scenario.next_tx(requester);
        {
            let mut registry = scenario.take_shared<Registry>();
            let reward = coin::mint_for_testing<SUI>(55, scenario.ctx());
            create_request(
                &mut registry,
                reward,
                b"Short range rescue".to_string(),
                b"Junction".to_string(),
                b"medium".to_string(),
                b"Abort mission".to_string(),
                20_000,
                true,
                false,
                scenario.ctx(),
            );
            test_scenario::return_shared(registry);
        };

        scenario.next_tx(requester);
        {
            let mut request = scenario.take_shared<RescueRequest>();
            cancel_open_request(&mut request, scenario.ctx());
            assert!(request.status == STATUS_CANCELLED);
            test_scenario::return_shared(request);
        };

        scenario.next_tx(requester);
        {
            let refund = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::burn_for_testing(refund) == 55);
        };

        scenario.end();
    }

    #[test_only]
    fun registry_for_testing(ctx: &mut sui::tx_context::TxContext): Registry {
        Registry {
            id: sui::object::new(ctx),
            total_requests: 0,
        }
    }

    #[test_only]
    fun request_for_testing(
        requester: address,
        responder: address,
        status: u8,
        reward_mist: u64,
        deadline_ms: u64,
        ctx: &mut sui::tx_context::TxContext,
    ): RescueRequest {
        RescueRequest {
            id: sui::object::new(ctx),
            registry_id: sui::object::id_from_address(@0x99),
            requester,
            responder,
            title: b"Test request".to_string(),
            start_system: b"Test system".to_string(),
            hazard_level: b"medium".to_string(),
            description: b"Test description".to_string(),
            deadline_ms,
            reward: coin::into_balance(coin::mint_for_testing<SUI>(reward_mist, ctx)),
            reward_mist,
            status,
            needs_fuel: true,
            needs_escort_home: false,
            created_at_ms: sui::tx_context::epoch_timestamp_ms(ctx),
            updated_at_ms: sui::tx_context::epoch_timestamp_ms(ctx),
        }
    }

    #[test_only]
    fun attempt_accept_for_testing(
        request: RescueRequest,
        ctx: &sui::tx_context::TxContext,
    ) {
        let mut request = request;
        accept_request(&mut request, ctx);
        sui::transfer::share_object(request);
    }

    #[test_only]
    fun attempt_mark_in_progress_for_testing(
        request: RescueRequest,
        ctx: &sui::tx_context::TxContext,
    ) {
        let mut request = request;
        mark_in_progress(&mut request, ctx);
        sui::transfer::share_object(request);
    }

    #[test_only]
    fun attempt_cancel_for_testing(
        request: RescueRequest,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let mut request = request;
        cancel_open_request(&mut request, ctx);
        sui::transfer::share_object(request);
    }

    #[test_only]
    fun attempt_create_request_for_testing(
        registry: Registry,
        reward_mist: u64,
        deadline_ms: u64,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let mut registry = registry;
        let reward = coin::mint_for_testing<SUI>(reward_mist, ctx);
        create_request(
            &mut registry,
            reward,
            b"Test create".to_string(),
            b"Outpost".to_string(),
            b"low".to_string(),
            b"Testing create_request guardrails".to_string(),
            deadline_ms,
            true,
            false,
            ctx,
        );
        sui::transfer::share_object(registry);
    }

    #[test, expected_failure(abort_code = E_REQUESTER_CANNOT_ACCEPT)]
    fun requester_cannot_accept_own_request() {
        let requester = @0xd;
        let ctx = &mut sui::tx_context::new_from_hint(requester, 1, 0, 1_000, 0);
        let request = request_for_testing(requester, NULL_ADDRESS, STATUS_OPEN, 25, 10_000, ctx);
        attempt_accept_for_testing(request, ctx);
    }

    #[test, expected_failure(abort_code = E_ONLY_REQUESTER)]
    fun non_requester_cannot_cancel_open_request() {
        let requester = @0xe;
        let stranger = @0xf;
        let ctx = &mut sui::tx_context::new_from_hint(stranger, 2, 0, 1_000, 0);
        let request = request_for_testing(requester, NULL_ADDRESS, STATUS_OPEN, 70, 12_000, ctx);
        attempt_cancel_for_testing(request, ctx);
    }

    #[test, expected_failure(abort_code = E_REQUEST_NOT_OPEN)]
    fun duplicate_accept_fails() {
        let requester = @0x10;
        let responder = @0x11;
        let second_responder = @0x12;
        let ctx = &mut sui::tx_context::new_from_hint(second_responder, 3, 0, 1_000, 0);
        let request = request_for_testing(requester, responder, STATUS_ACCEPTED, 88, 14_000, ctx);
        attempt_accept_for_testing(request, ctx);
    }

    #[test, expected_failure(abort_code = E_ONLY_RESPONDER)]
    fun non_responder_cannot_advance_status() {
        let requester = @0x13;
        let responder = @0x14;
        let stranger = @0x15;
        let ctx = &mut sui::tx_context::new_from_hint(stranger, 4, 0, 1_000, 0);
        let request = request_for_testing(requester, responder, STATUS_ACCEPTED, 91, 16_000, ctx);
        attempt_mark_in_progress_for_testing(request, ctx);
    }

    #[test, expected_failure(abort_code = E_EMPTY_REWARD)]
    fun zero_reward_fails() {
        let requester = @0x16;
        let ctx = &mut sui::tx_context::new_from_hint(requester, 5, 0, 1_000, 0);
        let registry = registry_for_testing(ctx);
        attempt_create_request_for_testing(registry, 0, 18_000, ctx);
    }

    #[test, expected_failure(abort_code = E_INVALID_DEADLINE)]
    fun expired_deadline_fails() {
        let requester = @0x17;
        let ctx = &mut sui::tx_context::new_from_hint(requester, 6, 0, 1_000, 0);
        let registry = registry_for_testing(ctx);
        attempt_create_request_for_testing(registry, 15, 0, ctx);
    }
}
