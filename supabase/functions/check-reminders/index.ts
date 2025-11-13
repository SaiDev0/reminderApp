// Supabase Edge Function to check and send reminders
// Deploy with: supabase functions deploy check-reminders
// Schedule with: Supabase Dashboard -> Database -> Cron Jobs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get today's date
        const today = new Date().toISOString().split("T")[0];

        // Update overdue bills
        await supabase.rpc("update_bill_status");

        // Get bills that need reminders today
        const { data: bills, error: billsError } = await supabase
            .from("bills")
            .select(`
        *,
        user_settings!inner(
          expo_push_token,
          push_notifications,
          email_notifications,
          user_id
        )
      `)
            .eq("status", "pending");

        if (billsError) throw billsError;

        const notifications = [];

        for (const bill of bills || []) {
            // Calculate days until due date
            const dueDate = new Date(bill.due_date);
            const todayDate = new Date(today);
            const daysUntilDue = Math.floor(
                (dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Check if we should send a reminder today
            if (bill.reminder_days_before.includes(daysUntilDue)) {
                // Check if we already sent a reminder today
                const { data: existingLog } = await supabase
                    .from("reminder_logs")
                    .select("id")
                    .eq("bill_id", bill.id)
                    .eq("reminder_date", today)
                    .single();

                if (!existingLog) {
                    // Send push notification if enabled and token exists
                    if (
                        bill.user_settings.push_notifications &&
                        bill.user_settings.expo_push_token
                    ) {
                        const message = {
                            to: bill.user_settings.expo_push_token,
                            sound: "default",
                            title: "Bill Reminder",
                            body: `${bill.name} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""
                                }. Amount: $${bill.amount}`,
                            data: { billId: bill.id, type: "bill_reminder" },
                        };

                        // Send to Expo Push Notification service
                        const response = await fetch("https://exp.host/--/api/v2/push/send", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(message),
                        });

                        const result = await response.json();

                        // Log the reminder
                        await supabase.from("reminder_logs").insert({
                            bill_id: bill.id,
                            reminder_date: today,
                            notification_type: "push",
                            status: result.data?.status === "ok" ? "sent" : "failed",
                        });

                        notifications.push({
                            bill: bill.name,
                            type: "push",
                            status: result.data?.status,
                        });
                    }

                    // TODO: Add email notification logic here using Resend/SendGrid
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Checked ${bills?.length || 0} bills`,
                notifications,
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});

