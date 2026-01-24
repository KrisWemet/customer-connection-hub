import { Link, useParams } from "react-router-dom";

export default function ContractSuccess() {
  const { contractId } = useParams<{ contractId: string }>();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-primary">Contract Signed</h1>
        <p className="text-sm text-muted-foreground">
          Thank you for signing your contract. We will follow up with next steps shortly.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Return Home
          </Link>
          {contractId && (
            <Link
              to={`/contract/sign/${contractId}`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
            >
              View Contract
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
