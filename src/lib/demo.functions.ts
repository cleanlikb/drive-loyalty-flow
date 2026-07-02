import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MILESTONES } from "./format";

const UK_MAKES_MODELS = [
  { make: "Nissan", model: "Qashqai", trim: "N-Connecta", price: 18500 },
  { make: "Volkswagen", model: "Golf", trim: "Match", price: 17200 },
  { make: "Ford", model: "Kuga", trim: "Titanium", price: 19400 },
  { make: "BMW", model: "3 Series", trim: "M Sport", price: 24800 },
  { make: "Kia", model: "Sportage", trim: "GT-Line", price: 20100 },
  { make: "Vauxhall", model: "Corsa", trim: "SRi", price: 12300 },
  { make: "Audi", model: "A3", trim: "S Line", price: 22000 },
  { make: "Toyota", model: "Yaris", trim: "Icon", price: 14200 },
  { make: "Hyundai", model: "Tucson", trim: "Premium", price: 19900 },
  { make: "Mercedes-Benz", model: "A-Class", trim: "AMG Line", price: 23500 },
  { make: "Peugeot", model: "3008", trim: "Allure", price: 17800 },
  { make: "Skoda", model: "Octavia", trim: "SE L", price: 16400 },
  { make: "Renault", model: "Clio", trim: "Iconic", price: 12800 },
  { make: "Honda", model: "Jazz", trim: "EX", price: 13600 },
  { make: "Mazda", model: "CX-5", trim: "Sport Nav", price: 21500 },
];

const UK_NAMES = [
  "James Whitmore","Sarah Patel","Michael Thompson","Emma Clarke","David O'Connor",
  "Lucy Harrison","Andrew Baker","Rachel Fowler","Chris Nolan","Sophie Bennett",
  "Daniel Walsh","Hannah Reid","Mark Ellis","Olivia Grant","Ben Hughes",
  "Charlotte Wood","Tom Butler","Alice Morgan","Ryan Turner","Grace Lloyd",
];

const DEMO_STOCK = [
  { make: "Nissan", model: "Qashqai", year: 2023, trim: "Tekna", price: 22400 },
  { make: "Volkswagen", model: "Golf", year: 2022, trim: "R-Line", price: 21200 },
  { make: "Ford", model: "Kuga", year: 2023, trim: "ST-Line X", price: 24900 },
  { make: "BMW", model: "3 Series", year: 2023, trim: "M Sport", price: 32800 },
  { make: "Kia", model: "Sportage", year: 2023, trim: "GT-Line S", price: 26400 },
  { make: "Audi", model: "A3", year: 2023, trim: "S Line", price: 28900 },
  { make: "Hyundai", model: "Tucson", year: 2023, trim: "Ultimate", price: 27100 },
  { make: "Mercedes-Benz", model: "A-Class", year: 2023, trim: "AMG Line Premium", price: 29500 },
  { make: "Skoda", model: "Octavia", year: 2023, trim: "vRS", price: 24800 },
  { make: "Toyota", model: "Yaris", year: 2023, trim: "GR Sport", price: 19800 },
];

function daysAgo(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function saleDateForMilestone(months: number, jitterDays: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() + jitterDays);
  return d.toISOString().slice(0, 10);
}

export const loadDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: dealer } = await context.supabase.from("dealers").select("*").eq("user_id", context.userId).single();
    if (!dealer) throw new Error("Dealer not found");

    // Wipe existing demo data for a clean state (only affects this dealer via RLS)
    await context.supabase.from("sequence_emails").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("replies").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("sequences").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("cohort_customers").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("cohorts").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("customers").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("stock").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("notifications").delete().eq("dealer_id", dealer.id);
    await context.supabase.from("activity_log").delete().eq("dealer_id", dealer.id);

    // Ensure dealer has onboarding info
    if (!dealer.dealership_name) {
      await context.supabase.from("dealers").update({
        dealership_name: "Whitfield Motors",
        salesperson_name: "James Whitfield",
        website_url: "https://whitfieldmotors.co.uk",
        onboarded_at: new Date().toISOString(),
      }).eq("id", dealer.id);
    }

    // Customers — spread across milestones
    const customers: any[] = [];
    let i = 0;
    for (const months of MILESTONES) {
      // 3 customers per milestone with different jitter
      for (let j = 0; j < 3; j++) {
        const veh = UK_MAKES_MODELS[i % UK_MAKES_MODELS.length];
        const name = UK_NAMES[i % UK_NAMES.length];
        customers.push({
          dealer_id: dealer.id,
          name,
          email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.co.uk`,
          vehicle_reg: `AB${(20 + i).toString().padStart(2, "0")} ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 3) % 26))}${String.fromCharCode(65 + ((i + 7) % 26))}`,
          make: veh.make,
          model: veh.model,
          trim: veh.trim,
          sale_date: saleDateForMilestone(months, j - 1),
          sale_price: veh.price,
          finance_type: j % 2 === 0 ? "PCP" : "HP",
          finance_term_months: j % 2 === 0 ? 36 : 48,
          status: "active",
        });
        i++;
      }
    }
    // Add "no longer owns" customer
    customers.push({
      dealer_id: dealer.id,
      name: "Peter Simmons",
      email: "peter.simmons@example.co.uk",
      vehicle_reg: "AB19 XYZ",
      make: "Ford", model: "Fiesta", trim: "Zetec",
      sale_date: saleDateForMilestone(24, 0),
      sale_price: 9500, finance_type: "HP", finance_term_months: 36,
      status: "no_longer_owns",
    });
    const { data: insertedCustomers } = await context.supabase.from("customers").insert(customers).select();

    // Stock
    const stockRows = DEMO_STOCK.map((s) => ({ ...s, dealer_id: dealer.id, source: "seed" as const, active: true }));
    const { data: insertedStock } = await context.supabase.from("stock").insert(stockRows).select();

    // Notification
    await context.supabase.from("notifications").insert({
      dealer_id: dealer.id,
      kind: "monthly_cohort",
      title: "Your monthly leads are ready",
      body: `${customers.length - 1} customers hit an anniversary this month.`,
    });

    // Activity
    await context.supabase.from("activity_log").insert([
      { dealer_id: dealer.id, kind: "demo_loaded", payload: { customers: insertedCustomers?.length, stock: insertedStock?.length } },
      { dealer_id: dealer.id, kind: "stock_synced", payload: { items: insertedStock?.length }, created_at: daysAgo(1) + "T09:00:00Z" },
    ]);

    // One active sequence mid-flight
    const firstCustomer = insertedCustomers?.find((c: any) => c.make === "Nissan");
    const matchedStock = insertedStock?.find((s: any) => s.make === "Nissan");
    if (firstCustomer && matchedStock) {
      const now = new Date();
      const day0 = new Date(now); day0.setDate(day0.getDate() - 2);
      const { data: seq } = await context.supabase.from("sequences").insert({
        dealer_id: dealer.id,
        customer_id: firstCustomer.id,
        stock_id: matchedStock.id,
        status: "active",
        started_at: day0.toISOString(),
      }).select().single();
      if (seq) {
        await context.supabase.from("sequence_emails").insert([
          {
            sequence_id: seq.id, dealer_id: dealer.id, step: 1, send_offset_days: 0,
            subject: `Checking in — how's the ${firstCustomer.model}?`,
            body: `Hi ${firstCustomer.name.split(" ")[0]},\n\nJames here from Whitfield Motors. It's been a while since you picked up your ${firstCustomer.make} ${firstCustomer.model} — just a quick note to see how you're getting on with it.\n\nWe've had strong demand for ${firstCustomer.model}s in part-exchange lately, so I wanted to keep in touch. No pitch — just wanted to check in.\n\nJames\nWhitfield Motors`,
            status: "sent", scheduled_for: day0.toISOString(), sent_at: day0.toISOString(),
          },
          {
            sequence_id: seq.id, dealer_id: dealer.id, step: 2, send_offset_days: 4,
            subject: `Something you might like`,
            body: `Hi ${firstCustomer.name.split(" ")[0]},\n\nA quick follow-up — we've just taken in a ${matchedStock.year} ${matchedStock.make} ${matchedStock.model} ${matchedStock.trim ?? ""} at £${Number(matchedStock.price ?? 0).toLocaleString()}. Given you've had your ${firstCustomer.model} for a couple of years now, I thought it might be worth flagging.\n\nSame make, newer year, similar price bracket. No rush — just thought I'd mention it.\n\nJames\nWhitfield Motors`,
            status: "scheduled", scheduled_for: new Date(day0.getTime() + 4 * 86400000).toISOString(),
          },
          {
            sequence_id: seq.id, dealer_id: dealer.id, step: 3, send_offset_days: 10,
            subject: `Part-exchange figure?`,
            body: `Hi ${firstCustomer.name.split(" ")[0]},\n\nLast one from me — if you'd like a rough part-exchange figure on your ${firstCustomer.model}, just reply with your current mileage and I'll come back with a number.\n\nJames\nWhitfield Motors`,
            status: "scheduled", scheduled_for: new Date(day0.getTime() + 10 * 86400000).toISOString(),
          },
        ]);
        await context.supabase.from("activity_log").insert({
          dealer_id: dealer.id, kind: "sequences_started", payload: { created: 1, failed: 0 },
        });
      }
    }

    return { ok: true, customers: customers.length, stock: DEMO_STOCK.length };
  });
