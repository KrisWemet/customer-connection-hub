import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import type { Tables } from "@/types/supabase";

const cardClass = "rounded-2xl border border-border/60 bg-card p-6 shadow-card";

function formatFileSize(size?: number | null) {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["client_booking", user?.email],
    enabled: supabaseConfigured && Boolean(user?.email),
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_name, client_email")
        .eq("client_email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["client_documents", booking?.id],
    enabled: supabaseConfigured && Boolean(booking?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("booking_id", booking?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tables<"documents">[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file to upload.");
      if (!booking?.id) throw new Error("No booking linked.");

      const extension = file.name.split(".").pop() || "file";
      const storagePath = `${booking.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("documents").insert({
        booking_id: booking.id,
        uploaded_by: user?.id ?? null,
        uploaded_by_role: "client",
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        description: description || null,
      });
      if (error) throw error;

      return storagePath;
    },
    onSuccess: () => {
      setFile(null);
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["client_documents", booking?.id] });
      toast.success("Document uploaded");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    },
  });

  const isLoading = bookingLoading || docsLoading;

  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Documents
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Your shared files</h1>
            <p className="text-sm text-muted-foreground">
              Upload timelines, layouts, and anything youd like the venue team to review.
            </p>
          </div>

          <SupabaseNotice title="Supabase not configured for documents." />

          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : !booking ? (
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">No booking linked</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldnt find a booking for {user?.email ?? "your account"}. If you think this is a mistake,
                let the venue team know.
              </p>
            </div>
          ) : (
            <>
              <div className={cardClass}>
                <h2 className="text-lg font-semibold text-foreground">Upload a new document</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    type="file"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    onClick={() => uploadMutation.mutate()}
                    disabled={uploadMutation.isPending || !file}
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload document"}
                  </button>
                </div>
              </div>

              <div className={cardClass}>
                <h2 className="text-lg font-semibold text-foreground">Recent uploads</h2>
                <div className="mt-4 divide-y divide-border/50">
                  {documents.length === 0 ? (
                    <p className="py-6 text-sm text-muted-foreground">No documents uploaded yet.</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between py-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{doc.file_name ?? "Document"}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.description ?? "No description"} · {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
                          </p>
                        </div>
                        <button
                          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
                          onClick={async () => {
                            if (!doc.storage_path) return;
                            const { data, error } = await supabase.storage
                              .from("client-documents")
                              .createSignedUrl(doc.storage_path, 60);
                            if (error) {
                              toast.error("Unable to download file");
                              return;
                            }
                            window.open(data?.signedUrl ?? "", "_blank");
                          }}
                        >
                          Download
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
