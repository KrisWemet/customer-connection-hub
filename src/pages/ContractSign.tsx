import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { generateContractHtml } from "@/lib/contracts/template";
import { getContract, generateContractPDF, markContractViewed, signContract } from "@/lib/contracts/service";
import { showError } from "@/lib/error-handler";

type ContractRow = Awaited<ReturnType<typeof getContract>>;

function buildHtml(contract: ContractRow) {
  return generateContractHtml({
    contractNumber: contract.contract_number,
    createdAt: contract.created_at ?? new Date().toISOString(),
    clientName: contract.client_name,
    clientEmail: contract.client_email,
    clientPhone: contract.client_phone,
    packageType: contract.package_type,
    eventStartDate: contract.event_start_date,
    eventEndDate: contract.event_end_date,
    totalAmount: contract.total_amount,
    depositAmount: contract.deposit_amount,
    gstRate: 0.05,
  });
}

async function getClientIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data?.ip as string | undefined;
  } catch {
    return undefined;
  }
}

function SignaturePad({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = 160;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111827";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl) onChange(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button
        type="button"
        className="mt-2 text-xs font-semibold text-primary"
        onClick={clear}
        disabled={disabled}
      >
        Clear signature
      </button>
    </div>
  );
}

export default function ContractSign() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [agree, setAgree] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [nameConfirm, setNameConfirm] = useState("");
  const [ipAddress, setIpAddress] = useState<string | undefined>();
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: contract, isLoading, error: contractError } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContract(contractId as string),
    enabled: Boolean(contractId),
  });

  // Handle query errors
  useEffect(() => {
    if (contractError) {
      showError(contractError, "Failed to load contract");
    }
  }, [contractError]);

  useEffect(() => {
    if (!contract) return;
    if (contract.status === "sent") {
      markContractViewed(contract.id);
    }
    if (!contract.pdf_url) {
      generateContractPDF(contract.id);
    }
  }, [contract]);

  useEffect(() => {
    getClientIp().then((ip) => setIpAddress(ip));
  }, []);

  useEffect(() => {
    const el = pdfContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        setHasScrolled(true);
      }
    };
    el.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [pdfContainerRef]);

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not found");
      return signContract(contract.id, signatureData, ipAddress ?? null);
    },
    onSuccess: () => {
      navigate(`/contract/success/${contractId}`);
    },
    onError: (error: unknown) => {
      showError(error, "Failed to sign contract");
    },
  });

  const isSigned = contract?.status === "signed";
  const canSign = Boolean(
    contract &&
      !isSigned &&
      hasScrolled &&
      agree &&
      signatureData &&
      nameConfirm.trim().toLowerCase() === contract.client_name.toLowerCase(),
  );

  const contractHtml = useMemo(() => (contract ? buildHtml(contract) : ""), [contract]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-3xl font-bold text-primary">Review & Sign Contract</h1>
          <p className="text-sm text-muted-foreground">
            Please review the contract below. Scroll to the bottom to enable signing.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div ref={pdfContainerRef} className="max-h-[500px] overflow-y-auto border-b border-border p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading contract...</p>
            ) : !contract ? (
              <p className="text-sm text-muted-foreground">Contract not found.</p>
            ) : contract?.pdf_url || contract?.signed_pdf_url ? (
              <iframe
                title="Contract PDF"
                src={contract.signed_pdf_url ?? contract.pdf_url ?? ""}
                className="h-[420px] w-full"
              />
            ) : (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: contractHtml }} />
            )}
          </div>

          <div className="space-y-4 p-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
              I agree to the terms outlined in this contract.
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Confirm full name
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={nameConfirm}
                onChange={(event) => setNameConfirm(event.target.value)}
                placeholder={contract?.client_name ?? "Full name"}
              />
            </label>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signature</p>
              <SignaturePad disabled={!hasScrolled || isSigned} onChange={setSignatureData} />
            </div>
            {!hasScrolled && (
              <p className="text-xs text-muted-foreground">Scroll through the contract to enable signing.</p>
            )}
            {isSigned && <p className="text-xs text-muted-foreground">This contract has already been signed.</p>}
            <button
              type="button"
              className={`w-full rounded-lg px-4 py-2 text-sm font-semibold ${
                canSign ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
              disabled={!canSign || signMutation.isPending}
              onClick={() => signMutation.mutate()}
            >
              {signMutation.isPending ? "Submitting..." : "Submit Signature"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
