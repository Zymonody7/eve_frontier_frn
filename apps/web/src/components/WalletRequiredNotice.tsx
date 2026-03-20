type WalletRequiredNoticeProps = {
  title?: string;
  body: string;
};

export function WalletRequiredNotice({
  title = "Wallet required",
  body
}: WalletRequiredNoticeProps) {
  return (
    <section className="panel notice-panel">
      <p className="eyebrow">Action gated</p>
      <h3>{title}</h3>
      <p className="subtle-text">{body}</p>
    </section>
  );
}
