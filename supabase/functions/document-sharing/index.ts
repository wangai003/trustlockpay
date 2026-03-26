import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    switch (action) {
      // ─── Share Milestone Document ────────────────────────────
      case "share_milestone_doc": {
        const { transaction_id, milestone_id, file_name, file_url, file_type, uploaded_by, uploader_name } = body;
        if (!transaction_id || !milestone_id || !file_url) {
          throw new Error("transaction_id, milestone_id, and file_url are required");
        }

        // Get milestone
        const { data: milestone, error: mErr } = await supabase
          .from("transaction_milestones")
          .select("*")
          .eq("id", milestone_id)
          .single();
        if (mErr) throw mErr;

        // Append to uploaded_documents jsonb
        const existingDocs = Array.isArray(milestone.uploaded_documents) ? milestone.uploaded_documents : [];
        const newDoc = {
          file_name: file_name || "Untitled",
          file_url,
          file_type: file_type || "application/pdf",
          uploaded_by: uploaded_by || "unknown",
          uploader_name: uploader_name || "Unknown",
          uploaded_at: new Date().toISOString(),
        };
        existingDocs.push(newDoc);

        const { error: uErr } = await supabase
          .from("transaction_milestones")
          .update({ uploaded_documents: existingDocs, updated_at: new Date().toISOString() })
          .eq("id", milestone_id);
        if (uErr) throw uErr;

        // Get transaction for party info
        const { data: tx } = await supabase
          .from("transactions")
          .select("buyer_id, vendor_id, tx_id, order_number")
          .eq("id", transaction_id)
          .single();

        // Get observers linked to this milestone
        const { data: observers } = await supabase
          .from("transaction_observers")
          .select("observer_email, observer_name")
          .eq("transaction_id", transaction_id)
          .contains("milestone_ids", [milestone_id]);

        // Notify all parties
        const notifyUserIds = [tx?.buyer_id, tx?.vendor_id].filter(Boolean);
        const fnUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/notification-triage";

        for (const userId of notifyUserIds) {
          try {
            await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                action: "triage",
                notification_type: "document_uploaded",
                severity: "medium",
                transaction_id: tx?.tx_id,
                user_id: userId,
                message: `New document "${file_name}" uploaded to milestone "${milestone.title}" by ${uploader_name || "a party"}.`,
                metadata: { milestone_id, file_name, file_url },
              }),
            });
          } catch (_) { /* best-effort */ }
        }

        // Admin copy reference in archived_reports (index only, not 7-year archive)
        await supabase.from("archived_reports").insert({
          name: `[Auto] ${file_name} — ${milestone.title}`,
          file_url,
          file_type: file_type || "PDF",
          file_size: "—",
          owner_role: "admin",
        });

        result = { document: newDoc, observers_notified: observers?.length || 0, parties_notified: notifyUserIds.length };
        break;
      }

      // ─── Get Transaction Documents ──────────────────────────
      case "get_transaction_documents": {
        const { transaction_id, user_id, user_role } = body;
        if (!transaction_id) throw new Error("transaction_id is required");

        // Get transaction
        const { data: tx, error: txErr } = await supabase
          .from("transactions")
          .select("id, buyer_id, vendor_id, tx_id, order_number")
          .eq("id", transaction_id)
          .single();
        if (txErr) throw txErr;

        // Authorization check
        if (user_role !== "admin" && user_id !== tx.buyer_id && user_id !== tx.vendor_id) {
          throw new Error("Unauthorized: you are not a party to this transaction");
        }

        // Get all milestones with documents
        const { data: milestones, error: msErr } = await supabase
          .from("transaction_milestones")
          .select("id, title, position, status, uploaded_documents")
          .eq("transaction_id", transaction_id)
          .order("position", { ascending: true });
        if (msErr) throw msErr;

        // Get acknowledgement forms
        const { data: ackForms } = await supabase
          .from("acknowledgement_forms")
          .select("id, title, form_type, pdf_url, created_at, signed_by_buyer, signed_by_vendor")
          .eq("transaction_id", transaction_id);

        // Group documents by milestone
        const grouped = milestones?.map((m) => {
          const docs = Array.isArray(m.uploaded_documents) ? m.uploaded_documents : [];
          return {
            milestone_id: m.id,
            milestone_title: m.title,
            milestone_position: m.position,
            milestone_status: m.status,
            documents: docs,
            document_count: docs.length,
          };
        });

        result = {
          transaction_id: tx.tx_id,
          order_number: tx.order_number,
          milestones: grouped,
          acknowledgement_forms: ackForms || [],
          total_documents: grouped?.reduce((sum, m) => sum + m.document_count, 0) || 0,
        };
        break;
      }

      // ─── Admin Archive Document ─────────────────────────────
      case "admin_archive_document": {
        const { file_name, file_url, file_type, file_size, owner_id } = body;
        if (!file_name || !file_url) throw new Error("file_name and file_url are required");

        const { data, error } = await supabase
          .from("archived_reports")
          .insert({
            name: `[7yr Archive] ${file_name}`,
            file_url,
            file_type: file_type || "PDF",
            file_size: file_size || "—",
            owner_id: owner_id || null,
            owner_role: "admin",
          })
          .select()
          .single();
        if (error) throw error;

        result = { archived: true, record: data };
        break;
      }

      // ─── Search Documents ───────────────────────────────────
      case "search_documents": {
        const { query, date_from, date_to, file_type: searchFileType, user_role: searchRole, user_id: searchUserId } = body;
        if (!query || query.length < 2) throw new Error("query must be at least 2 characters");

        const searchTerm = `%${query}%`;

        // Search milestone documents via transactions + milestones
        const { data: milestones } = await supabase
          .from("transaction_milestones")
          .select(`
            id, title, position, uploaded_documents, transaction_id, status,
            transactions:transaction_id (
              tx_id, order_number, buyer_name, vendor_name, buyer_id, vendor_id, item, industry
            )
          `)
          .not("uploaded_documents", "eq", "[]");

        // Filter milestone docs by query
        interface MilestoneDoc {
          file_name?: string;
          file_url?: string;
          file_type?: string;
          uploader_name?: string;
          uploaded_at?: string;
        }

        interface TransactionRef {
          tx_id?: string;
          order_number?: number;
          buyer_name?: string;
          vendor_name?: string;
          buyer_id?: string;
          vendor_id?: string;
          item?: string;
          industry?: string;
        }

        const docResults: Array<{
          source: string;
          file_name: string;
          file_url: string;
          file_type: string;
          uploader: string;
          uploaded_at: string;
          milestone_title: string;
          transaction_id: string;
          order_number: number | null;
          buyer_name: string;
          vendor_name: string;
        }> = [];

        const lowerQuery = query.toLowerCase();

        milestones?.forEach((m: any) => {
          const tx: TransactionRef = m.transactions || {};
          const docs: MilestoneDoc[] = Array.isArray(m.uploaded_documents) ? m.uploaded_documents : [];

          // Check if transaction matches query
          const txMatch =
            (tx.tx_id || "").toLowerCase().includes(lowerQuery) ||
            String(tx.order_number || "").includes(lowerQuery) ||
            (tx.buyer_name || "").toLowerCase().includes(lowerQuery) ||
            (tx.vendor_name || "").toLowerCase().includes(lowerQuery) ||
            (tx.item || "").toLowerCase().includes(lowerQuery) ||
            m.title.toLowerCase().includes(lowerQuery);

          docs.forEach((doc: MilestoneDoc) => {
            const docMatch = (doc.file_name || "").toLowerCase().includes(lowerQuery);

            if (txMatch || docMatch) {
              // Filter by file type if specified
              if (searchFileType && doc.file_type && !doc.file_type.includes(searchFileType)) return;

              // Filter by date range
              if (date_from && doc.uploaded_at && doc.uploaded_at < date_from) return;
              if (date_to && doc.uploaded_at && doc.uploaded_at > date_to) return;

              // Role-based filtering
              if (searchRole !== "admin" && searchUserId) {
                if (searchUserId !== tx.buyer_id && searchUserId !== tx.vendor_id) return;
              }

              docResults.push({
                source: "milestone",
                file_name: doc.file_name || "Untitled",
                file_url: doc.file_url || "",
                file_type: doc.file_type || "unknown",
                uploader: doc.uploader_name || "Unknown",
                uploaded_at: doc.uploaded_at || "",
                milestone_title: m.title,
                transaction_id: tx.tx_id || "",
                order_number: tx.order_number || null,
                buyer_name: tx.buyer_name || "",
                vendor_name: tx.vendor_name || "",
              });
            }
          });
        });

        // Also search acknowledgement forms
        const { data: ackForms } = await supabase
          .from("acknowledgement_forms")
          .select(`
            id, title, form_type, pdf_url, created_at,
            transactions:transaction_id (
              tx_id, order_number, buyer_name, vendor_name, buyer_id, vendor_id
            )
          `)
          .or(`title.ilike.${searchTerm}`);

        ackForms?.forEach((f: any) => {
          const tx: TransactionRef = f.transactions || {};
          if (searchRole !== "admin" && searchUserId) {
            if (searchUserId !== tx.buyer_id && searchUserId !== tx.vendor_id) return;
          }
          docResults.push({
            source: "acknowledgement_form",
            file_name: f.title,
            file_url: f.pdf_url || "",
            file_type: "PDF",
            uploader: "System",
            uploaded_at: f.created_at,
            milestone_title: f.form_type,
            transaction_id: tx.tx_id || "",
            order_number: tx.order_number || null,
            buyer_name: tx.buyer_name || "",
            vendor_name: tx.vendor_name || "",
          });
        });

        // Search archived reports
        const { data: archived } = await supabase
          .from("archived_reports")
          .select("*")
          .ilike("name", searchTerm)
          .limit(10);

        archived?.forEach((a: any) => {
          docResults.push({
            source: "archive",
            file_name: a.name,
            file_url: a.file_url || "",
            file_type: a.file_type || "PDF",
            uploader: "Admin",
            uploaded_at: a.created_at,
            milestone_title: "Archived",
            transaction_id: "",
            order_number: null,
            buyer_name: "",
            vendor_name: "",
          });
        });

        result = { documents: docResults, total: docResults.length };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
