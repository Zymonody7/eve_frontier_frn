import type {
  CreateRescueRequestInput,
  MyDashboardData,
  ResponseNetworkAdapter
} from "./adapter";
import {
  acceptLocalRequest,
  cancelLocalOpenRequest,
  confirmLocalRequestCompletion,
  createLocalRequest,
  getLocalDashboard,
  getLocalEscrow,
  getLocalRequestActivity,
  getLocalRequest,
  listLocalOpenRequests,
  listLocalRequests,
  markLocalRequestAwaitingConfirmation,
  markLocalRequestInProgress
} from "./localStore";

const delay = (ms = 120) => new Promise((resolve) => window.setTimeout(resolve, ms));

export class LocalResponseNetworkAdapter implements ResponseNetworkAdapter {
  async refreshChainReads() {
    await delay();
  }

  async listRequests() {
    await delay();
    return listLocalRequests();
  }

  async listOpenRequests() {
    await delay();
    return listLocalOpenRequests();
  }

  async getRequest(id: string) {
    await delay();
    return getLocalRequest(id);
  }

  async getEscrow(id: string) {
    await delay();
    return getLocalEscrow(id);
  }

  async getRequestActivity(id: string) {
    await delay();
    return getLocalRequestActivity(id);
  }

  async createRescueRequest(input: CreateRescueRequestInput) {
    await delay();
    return createLocalRequest(input);
  }

  async acceptRequest(id: string, actor: string) {
    await delay();
    return acceptLocalRequest(id, actor);
  }

  async markInProgress(id: string, actor: string) {
    await delay();
    return markLocalRequestInProgress(id, actor);
  }

  async markAwaitingConfirmation(id: string, actor: string) {
    await delay();
    return markLocalRequestAwaitingConfirmation(id, actor);
  }

  async confirmCompletion(id: string, actor: string) {
    await delay();
    return confirmLocalRequestCompletion(id, actor);
  }

  async cancelOpenRequest(id: string, actor: string) {
    await delay();
    return cancelLocalOpenRequest(id, actor);
  }

  async getMyDashboard(address: string): Promise<MyDashboardData> {
    await delay();
    return getLocalDashboard(address);
  }
}
