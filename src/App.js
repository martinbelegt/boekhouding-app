import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const SUPABASE_URL = "https://ewiozbdikpaeavunxvlx.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3aW96YmRpa3BhZWF2dW54dmx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjEyMjIsImV4cCI6MjA5MjU5NzIyMn0.PeQKEZ5xa6H7sMGpfSDvvUo9QZ4GyVUQcrdGINPFDl0";

const SUPABASE_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json",
};

async function testSupabaseFetch() {
  const response = await fetch(SUPABASE_URL + "/rest/v1/invoices?select=*", {
    headers: getAuthHeaders(),
  });

  const text = await response.text();
  console.log("SUPABASE FETCH TEST:", response.status, text);
}

const SETTINGS = {
  name: "Evelien van Buren Music",
  iban: "NL37 KNAB 0404 6691 74",
};

const initialInvoices = [];

const initialCustomers = [];

const initialExpenses = [];

const initialBankRows = [];

function formatEuro(value) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextCustomerId(customers) {
  const highest = customers.reduce((max, customer) => {
    const number = Number(String(customer.id || "").replace(/[^0-9]/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return "K" + String(highest + 1).padStart(3, "0");
}

function nextInvoiceNumber(invoices, dateValue) {
  const year = dateValue
    ? new Date(dateValue).getFullYear()
    : new Date().getFullYear();
  const yearInvoices = invoices.filter((invoice) =>
    String(invoice.invoiceNumber).startsWith(String(year))
  );
  return year + "-" + String(yearInvoices.length + 1).padStart(3, "0");
}

function TextInput({ label, value, onChange, type = "text" }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          fontSize: 12,
          color: "#64748b",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 14,
        }}
      />
    </label>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function InfoBox({ title, value, bg, color }) {
  return (
    <div
      style={{
        background: bg,
        padding: 14,
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: 12, color, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div
      style={{
        marginTop: 16,
        overflowX: "auto",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        background: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#475569",
                  borderBottom: "1px solid #e2e8f0",
                  whiteSpace: "nowrap",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                style={{
                  padding: 14,
                  color: "#64748b",
                }}
              >
                Geen gegevens.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                style={{
                  background: index % 2 === 0 ? "white" : "#f8fafc",
                }}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid #f1f5f9",
                      color: "#334155",
                      verticalAlign: "top",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [customers, setCustomers] = useState(initialCustomers);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [bankRows, setBankRows] = useState(initialBankRows);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingBankId, setEditingBankId] = useState(null);

  useEffect(() => {
    if (!session) return;

    loadInvoices();
    loadCustomers();
    loadExpenses();
    loadBankRows();
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  function getAuthHeaders() {
    return {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    };
  }

  async function loadCustomers() {
    console.log("CUSTOMERS TOKEN:", session?.access_token);
    console.log("CUSTOMERS USER:", session?.user?.id);
    console.log("CUSTOMERS HEADERS:", getAuthHeaders());
    const response = await fetch(SUPABASE_URL + "/rest/v1/customers?select=*", {
      headers: getAuthHeaders(),
    });

    const text = await response.text();
    console.log("LOAD CUSTOMERS:", response.status, text);

    if (!response.ok) return;

    const rows = JSON.parse(text);
    setCustomers(rows); // ✅ werkt nu
  }

  async function loadExpenses() {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/expenses?select=*&order=date.asc",
      {
        headers: getAuthHeaders(),
      }
    );

    const text = await response.text();
    console.log("LOAD EXPENSES:", response.status, text);

    if (!response.ok) {
      alert("Kosten laden mislukt");
      return;
    }

    const rows = JSON.parse(text);

    const mappedExpenses = rows.map((row) => ({
      id: row.id,
      date: row.date,
      supplier: row.supplier,
      description: row.description,
      amount: Number(row.amount || 0),
      paidVia: row.paid_via || "",
    }));

    setExpenses(mappedExpenses);
  }

  async function loadBankRows() {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/bank_rows?select=*&order=date.asc",
      { headers: getAuthHeaders() }
    );

    const text = await response.text();

    if (!response.ok) {
      console.error("BANK LADEN MISLUKT:", text);
      alert("Bank laden mislukt");
      return;
    }

    const rows = JSON.parse(text);

    setBankRows(
      rows.map((row) => ({
        id: row.id,
        date: row.date,
        description: row.description,
        inAmount: Number(row.in_amount || 0),
        outAmount: Number(row.out_amount || 0),
        account: row.account || "betaal",
      }))
    );
  }

  const [customerForm, setCustomerForm] = useState({
    id: nextCustomerId(initialCustomers),
    name: "",
    contact: "",
    email: "",
    city: "",
    note: "",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    date: today(),
    customerId: "K001",
    description: "",
    amount: "",
    paid: false,
    paidDate: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    date: today(),
    supplier: "",
    description: "",
    amount: "",
    paidVia: "Zakelijke rekening",
  });
  const [bankForm, setBankForm] = useState({
    date: today(),
    description: "",
    inAmount: "",
    outAmount: "",
    account: "betaal",
  });

  const customerById = useMemo(
    () =>
      Object.fromEntries(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const totals = useMemo(() => {
    const income = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0
    );
    const paidIncome = invoices
      .filter((invoice) => invoice.paid)
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const outstanding = income - paidIncome;
    const costs = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );
    const result = income - costs;
    const bankBalance = bankRows.reduce(
      (saldo, row) =>
        saldo + Number(row.inAmount || 0) - Number(row.outAmount || 0),
      0
    );
    return { income, paidIncome, outstanding, costs, result, bankBalance };
  }, [invoices, expenses, bankRows]);

  async function addCustomer() {
    if (!customerForm.name.trim()) return;

    const newCustomer = {
      id: customerForm.id,
      name: customerForm.name,
      contact: customerForm.contact,
      email: customerForm.email,
      city: customerForm.city,
      note: customerForm.note,
      user_id: session.user.id,
    };

    let response;

    if (editingCustomerId) {
      // UPDATE
      response = await fetch(
        SUPABASE_URL + "/rest/v1/customers?id=eq." + editingCustomerId,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(newCustomer),
        }
      );
    } else {
      // INSERT
      response = await fetch(SUPABASE_URL + "/rest/v1/customers", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(newCustomer),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("OPSLAAN MISLUKT:", text);
      alert("Opslaan mislukt");
      return;
    }

    loadCustomers();

    setCustomerForm({
      id: nextCustomerId(customers),
      name: "",
      contact: "",
      email: "",
      city: "",
      note: "",
    });

    setEditingCustomerId(null);
  }

  async function loadInvoices() {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/invoices?select=*&order=date.asc",
      {
        headers: getAuthHeaders(),
      }
    );

    const text = await response.text();
    console.log("LOAD INVOICES:", response.status, text);

    if (!response.ok) {
      alert("Facturen laden mislukt. Kijk in de console.");
      return;
    }

    const rows = JSON.parse(text);

    const mappedInvoices = rows.map((row) => ({
      id: row.id,
      date: row.date,
      invoiceNumber: row.invoice_number,
      customerId: row.customer_id,
      description: row.description,
      amount: Number(row.amount || 0),
      paid: row.paid,
      paidDate: row.paid_date || "",
    }));

    setInvoices(mappedInvoices);
  }

  async function addInvoice() {
    if (!invoiceForm.date || !invoiceForm.customerId || !invoiceForm.amount)
      return;

    const invoiceNumber = nextInvoiceNumber(invoices, invoiceForm.date);

    const newInvoice = {
      date: invoiceForm.date,
      invoice_number: invoiceNumber,
      customer_id: invoiceForm.customerId,
      description: invoiceForm.description,
      amount: Number(invoiceForm.amount),
      paid: invoiceForm.paid,
      paid_date: invoiceForm.paidDate || null,
      user_id: session.user.id,
    };

    let response;

    if (editingInvoiceId) {
      // UPDATE
      response = await fetch(
        SUPABASE_URL + "/rest/v1/invoices?id=eq." + editingInvoiceId,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(newInvoice),
        }
      );
    } else {
      // INSERT
      response = await fetch(SUPABASE_URL + "/rest/v1/invoices", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(newInvoice),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("OPSLAAN MISLUKT:", text);
      alert("Opslaan mislukt");
      return;
    }

    loadInvoices();

    setInvoiceForm({
      date: today(),
      customerId: "",
      description: "",
      amount: "",
      paid: false,
      paidDate: "",
    });

    setEditingInvoiceId(null);
  }

  async function addExpense() {
    if (!expenseForm.date || !expenseForm.description || !expenseForm.amount)
      return;

    const newExpense = {
      date: expenseForm.date,
      supplier: expenseForm.supplier,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      paid_via: expenseForm.paidVia,
      user_id: session.user.id,
    };

    let response;

    if (editingExpenseId) {
      // UPDATE
      response = await fetch(
        SUPABASE_URL + "/rest/v1/expenses?id=eq." + editingExpenseId,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(newExpense),
        }
      );
    } else {
      // INSERT
      response = await fetch(SUPABASE_URL + "/rest/v1/expenses", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(newExpense),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("OPSLAAN MISLUKT:", text);
      alert("Opslaan mislukt");
      return;
    }

    // opnieuw laden uit Supabase (simpel en veilig)
    loadExpenses();

    setExpenseForm({
      date: today(),
      supplier: "",
      description: "",
      amount: "",
      paidVia: "Zakelijke rekening",
    });

    setEditingExpenseId(null);
  }

  async function addBankRow() {
    if (!bankForm.date || !bankForm.description) return;

    const newRow = {
      date: bankForm.date,
      description: bankForm.description,
      in_amount: Number(bankForm.inAmount || 0),
      out_amount: Number(bankForm.outAmount || 0),
      account: bankForm.account,
      user_id: session.user.id,
    };

    let response;

    if (editingBankId) {
      // UPDATE
      response = await fetch(
        SUPABASE_URL + "/rest/v1/bank_rows?id=eq." + editingBankId,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(newRow),
        }
      );
    } else {
      // INSERT
      response = await fetch(SUPABASE_URL + "/rest/v1/bank_rows", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(newRow),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("BANK OPSLAAN MISLUKT:", text);
      alert("Opslaan mislukt");
      return;
    }

    loadBankRows();

    setBankForm({
      date: today(),
      description: "",
      inAmount: "",
      outAmount: "",
      account: bankForm.account,
    });

    setEditingBankId(null);
  }

  const tabs = [
    ["dashboard", "Overzicht"],
    ["customers", "Klanten"],
    ["invoices", "Inkomsten"],
    ["expenses", "Kosten"],
    ["bank", "Bank"],
    ["debtors", "Debiteuren"],
  ];

  async function login() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      alert("Inloggen mislukt");
      return;
    }

    setSession(data.session);
  }

  async function deleteExpense(id) {
    if (
      !window.confirm("Weet je zeker dat je deze kostenregel wilt verwijderen?")
    ) {
      return;
    }

    const response = await fetch(
      SUPABASE_URL + "/rest/v1/expenses?id=eq." + id,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("KOSTEN VERWIJDEREN MISLUKT:", text);
      alert("Verwijderen mislukt");
      return;
    }

    setExpenses((current) => current.filter((expense) => expense.id !== id));
  }

  async function deleteCustomer(id) {
    if (!window.confirm("Weet je zeker dat je deze klant wilt verwijderen?")) {
      return;
    }

    const response = await fetch(
      SUPABASE_URL + "/rest/v1/customers?id=eq." + id,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("KLANT VERWIJDEREN MISLUKT:", text);
      alert("Verwijderen mislukt");
      return;
    }

    setCustomers((current) => current.filter((customer) => customer.id !== id));
  }

  async function deleteInvoice(id) {
    if (
      !window.confirm("Weet je zeker dat je deze factuur wilt verwijderen?")
    ) {
      return;
    }

    const response = await fetch(
      SUPABASE_URL + "/rest/v1/invoices?invoice_number=eq." + id,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("FACTUUR VERWIJDEREN MISLUKT:", text);
      alert("Verwijderen mislukt");
      return;
    }

    await loadInvoices();
  }
  async function deleteBankRow(id) {
    if (
      !window.confirm("Weet je zeker dat je deze transactie wilt verwijderen?")
    ) {
      return;
    }

    const response = await fetch(
      SUPABASE_URL + "/rest/v1/bank_rows?id=eq." + id,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("BANK VERWIJDEREN MISLUKT:", text);
      alert("Verwijderen mislukt");
      return;
    }

    setBankRows((current) => current.filter((row) => row.id !== id));
  }
  function editCustomer(customer) {
    setCustomerForm({
      id: customer.id,
      name: customer.name,
      contact: customer.contact,
      email: customer.email,
      city: customer.city,
      note: customer.note,
    });

    setEditingCustomerId(customer.id);
  }

  function editExpense(expense) {
    setExpenseForm({
      date: expense.date,
      supplier: expense.supplier,
      description: expense.description,
      amount: expense.amount,
      paidVia: expense.paidVia,
    });

    setEditingExpenseId(expense.id);
  }

  function editInvoice(invoice) {
    setInvoiceForm({
      date: invoice.date,
      customerId: invoice.customerId,
      description: invoice.description,
      amount: invoice.amount,
      paid: invoice.paid,
      paidDate: invoice.paidDate || "",
    });

    setEditingInvoiceId(invoice.id);
  }

  function editBankRow(row) {
    setBankForm({
      date: row.date,
      description: row.description,
      inAmount: row.inAmount,
      outAmount: row.outAmount,
      account: row.account,
    });

    setEditingBankId(row.id);
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: 20 }}>
        <div
          style={{
            maxWidth: 420,
            margin: "80px auto",
            background: "white",
            padding: 24,
            borderRadius: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Inloggen
          </h1>
          <p style={{ color: "#64748b", marginBottom: 20 }}>
            Boekhouding Evelien van Buren Music
          </p>

          <TextInput
            label="E-mailadres"
            type="email"
            value={loginEmail}
            onChange={setLoginEmail}
          />

          <div style={{ height: 12 }} />

          <TextInput
            label="Wachtwoord"
            type="password"
            value={loginPassword}
            onChange={setLoginPassword}
          />

          <button
            onClick={login}
            style={{
              marginTop: 18,
              width: "100%",
              background: "#2563eb",
              color: "white",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Inloggen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div
        className="space-y-4"
        style={{
          maxWidth: 950,
          margin: "0 auto",
        }}
      >
        <header className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
          <p className="text-sm text-slate-300">{SETTINGS.name}</p>
          <h1 className="text-2xl font-bold">Eenvoudige boekhouding</h1>
          <p className="mt-1 text-sm text-slate-300">
            Inkomsten uit overig werk · zonder btw · basisversie
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Zakelijke rekening: {SETTINGS.iban}
          </p>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setSession(null);
            }}
            style={{
              marginTop: 12,
              padding: "6px 10px",
              borderRadius: 8,
              background: "#ef4444",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Uitloggen
          </button>
        </header>

        <nav className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={
                "rounded-xl px-4 py-2 text-sm font-medium " +
                (activeTab === key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200")
              }
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "dashboard" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <InfoBox
                title="Totale inkomsten"
                value={formatEuro(totals.income)}
                bg="#dbeafe"
                color="#1d4ed8"
              />
              <InfoBox
                title="Openstaand"
                value={formatEuro(totals.outstanding)}
                bg="#fef3c7"
                color="#92400e"
              />
              <InfoBox
                title="Kosten"
                value={formatEuro(totals.costs)}
                bg="#fee2e2"
                color="#991b1b"
              />
              <InfoBox
                title="Resultaat"
                value={formatEuro(totals.result)}
                bg="#dcfce7"
                color="#166534"
              />
              <InfoBox
                title="Betaalrekening"
                value={formatEuro(
                  bankRows
                    .filter((r) => r.account === "betaal")
                    .reduce(
                      (s, r) =>
                        s + Number(r.inAmount || 0) - Number(r.outAmount || 0),
                      0
                    )
                )}
                bg="#e0f2fe"
                color="#0369a1"
              />
              <InfoBox
                title="Spaar belasting"
                value={formatEuro(
                  bankRows
                    .filter((r) => r.account === "spaar")
                    .reduce(
                      (s, r) =>
                        s + Number(r.inAmount || 0) - Number(r.outAmount || 0),
                      0
                    )
                )}
                bg="#f3e8ff"
                color="#7c3aed"
              />
            </div>
          </div>
        )}

        {activeTab === "customers" && (
          <SectionCard title="Klanten">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <TextInput
                label="Klantnummer"
                value={customerForm.id}
                onChange={(id) => setCustomerForm({ ...customerForm, id })}
              />
              <TextInput
                label="Klantnaam"
                value={customerForm.name}
                onChange={(name) => setCustomerForm({ ...customerForm, name })}
              />
              <TextInput
                label="Contactpersoon"
                value={customerForm.contact}
                onChange={(contact) =>
                  setCustomerForm({ ...customerForm, contact })
                }
              />
              <TextInput
                label="E-mail"
                value={customerForm.email}
                onChange={(email) =>
                  setCustomerForm({ ...customerForm, email })
                }
              />
              <TextInput
                label="Plaats"
                value={customerForm.city}
                onChange={(city) => setCustomerForm({ ...customerForm, city })}
              />
              <TextInput
                label="Opmerking"
                value={customerForm.note}
                onChange={(note) => setCustomerForm({ ...customerForm, note })}
              />
            </div>
            <button
              onClick={addCustomer}
              style={{
                background: "#2563eb",
                color: "white",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              Klant toevoegen
            </button>
            <Table
              headers={["Nr", "Naam", "Contact", "Email", "Plaats", "Acties"]}
              rows={customers.map((c) => [
                c.id,
                c.name,
                c.contact,
                c.email,
                c.city,

                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => editCustomer(c)}>Wijzig</button>
                  <button onClick={() => deleteCustomer(c.id)}>
                    Verwijder
                  </button>
                </div>,
              ])}
            />
          </SectionCard>
        )}

        {activeTab === "invoices" && (
          <SectionCard title="Inkomsten / facturen registreren">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <TextInput
                label="Datum"
                type="date"
                value={invoiceForm.date}
                onChange={(date) => setInvoiceForm({ ...invoiceForm, date })}
              />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Klantnummer
                </span>
                <select
                  value={invoiceForm.customerId}
                  onChange={(event) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      customerId: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.id} · {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput
                label="Bedrag"
                type="number"
                value={invoiceForm.amount}
                onChange={(amount) =>
                  setInvoiceForm({ ...invoiceForm, amount })
                }
              />
              <TextInput
                label="Omschrijving"
                value={invoiceForm.description}
                onChange={(description) =>
                  setInvoiceForm({ ...invoiceForm, description })
                }
              />
              <label className="flex items-center gap-2 pt-7 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={invoiceForm.paid}
                  onChange={(event) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      paid: event.target.checked,
                    })
                  }
                />{" "}
                Betaald
              </label>
              <TextInput
                label="Datum betaald"
                type="date"
                value={invoiceForm.paidDate}
                onChange={(paidDate) =>
                  setInvoiceForm({ ...invoiceForm, paidDate })
                }
              />
            </div>
            <button
              onClick={addInvoice}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              + Factuur opslaan
            </button>
            <Table
              headers={["Nr", "Klant", "Datum", "Bedrag", "Status", "Acties"]}
              rows={invoices.map((i) => [
                i.invoiceNumber,
                customerById[i.customerId]?.name || i.customerId,
                i.date,
                formatEuro(i.amount),
                i.paid ? "Betaald" : "Openstaand",

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => editInvoice(i)}
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      border: "none",
                      borderRadius: 8,
                      padding: "5px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Wijzig
                  </button>

                  <button
                    onClick={() => deleteInvoice(i.invoiceNumber)}
                    style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "none",
                      borderRadius: 8,
                      padding: "5px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Verwijder
                  </button>
                </div>,
              ])}
            />
          </SectionCard>
        )}

        {activeTab === "expenses" && (
          <SectionCard title="Kosten">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <TextInput
                label="Datum"
                type="date"
                value={expenseForm.date}
                onChange={(date) => setExpenseForm({ ...expenseForm, date })}
              />
              <TextInput
                label="Leverancier"
                value={expenseForm.supplier}
                onChange={(supplier) =>
                  setExpenseForm({ ...expenseForm, supplier })
                }
              />
              <TextInput
                label="Bedrag"
                type="number"
                value={expenseForm.amount}
                onChange={(amount) =>
                  setExpenseForm({ ...expenseForm, amount })
                }
              />
              <TextInput
                label="Omschrijving"
                value={expenseForm.description}
                onChange={(description) =>
                  setExpenseForm({ ...expenseForm, description })
                }
              />
              <TextInput
                label="Betaald via"
                value={expenseForm.paidVia}
                onChange={(paidVia) =>
                  setExpenseForm({ ...expenseForm, paidVia })
                }
              />
            </div>
            <button
              onClick={addExpense}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Kosten toevoegen
            </button>
            <Table
              headers={[
                "Datum",
                "Leverancier",
                "Omschrijving",
                "Bedrag",
                "Betaald via",
                "Acties",
              ]}
              rows={expenses.map((e) => [
                e.date,
                e.supplier,
                e.description,
                formatEuro(e.amount),
                e.paidVia,
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => editExpense(e)}
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      border: "none",
                      borderRadius: 8,
                      padding: "5px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Wijzig
                  </button>

                  <button
                    onClick={() => deleteExpense(e.id)}
                    style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "none",
                      borderRadius: 8,
                      padding: "5px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Verwijder
                  </button>
                </div>,
              ])}
            />
          </SectionCard>
        )}

        {activeTab === "bank" && (
          <SectionCard title="Bank (zakelijke rekening)">
            <div className="mb-4 grid gap-3 md:grid-cols-5">
              <TextInput
                label="Datum"
                type="date"
                value={bankForm.date}
                onChange={(date) => setBankForm({ ...bankForm, date })}
              />

              <TextInput
                label="Omschrijving"
                value={bankForm.description}
                onChange={(description) =>
                  setBankForm({ ...bankForm, description })
                }
              />

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Rekening
                </span>
                <select
                  value={bankForm.account}
                  onChange={(event) =>
                    setBankForm({ ...bankForm, account: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="betaal">Betaalrekening</option>
                  <option value="spaar">Spaarrekening belastingreserve</option>
                </select>
              </label>

              <TextInput
                label="In (€)"
                type="number"
                value={bankForm.inAmount}
                onChange={(inAmount) =>
                  setBankForm({ ...bankForm, inAmount, outAmount: "" })
                }
              />

              <TextInput
                label="Uit (€)"
                type="number"
                value={bankForm.outAmount}
                onChange={(outAmount) =>
                  setBankForm({ ...bankForm, outAmount, inAmount: "" })
                }
              />
            </div>

            <button
              onClick={addBankRow}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              + Transactie opslaan
            </button>

            <Table
              headers={[
                "Datum",
                "Rekening",
                "Omschrijving",
                "In",
                "Uit",
                "Saldo",
                "Acties",
              ]}
              rows={bankRows.map((row, index) => {
                const saldo = bankRows
                  .filter((r) => r.account === row.account)
                  .slice(0, index + 1)
                  .reduce(
                    (s, r) =>
                      s + Number(r.inAmount || 0) - Number(r.outAmount || 0),
                    0
                  );

                return [
                  row.date,
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      row.account === "betaal"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {row.account === "betaal"
                      ? "Betaalrekening"
                      : "Spaar (belasting)"}
                  </span>,
                  row.description,
                  <span className="text-green-600 font-medium">
                    {formatEuro(row.inAmount)}
                  </span>,
                  <span className="text-red-600 font-medium">
                    {formatEuro(row.outAmount)}
                  </span>,
                  <span
                    style={{
                      fontWeight: 600,
                      color: saldo >= 0 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {formatEuro(saldo)}
                  </span>,

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => editBankRow(row)}
                      style={{
                        background: "#e0f2fe",
                        color: "#0369a1",
                        border: "none",
                        borderRadius: 8,
                        padding: "5px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Wijzig
                    </button>

                    <button
                      onClick={() => deleteBankRow(row.id)}
                      style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "none",
                        borderRadius: 8,
                        padding: "5px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Verwijder
                    </button>
                  </div>,
                ];
              })}
            />

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              <div
                style={{ background: "#dbeafe", padding: 10, borderRadius: 10 }}
              >
                <div style={{ fontSize: 12, color: "#1d4ed8" }}>
                  Betaalrekening
                </div>
                <div style={{ fontWeight: "bold" }}>
                  {formatEuro(
                    bankRows
                      .filter((r) => r.account === "betaal")
                      .reduce(
                        (s, r) =>
                          s +
                          Number(r.inAmount || 0) -
                          Number(r.outAmount || 0),
                        0
                      )
                  )}
                </div>
              </div>

              <div
                style={{ background: "#f3e8ff", padding: 10, borderRadius: 10 }}
              >
                <div style={{ fontSize: 12, color: "#7c3aed" }}>
                  Spaar (belasting)
                </div>
                <div style={{ fontWeight: "bold" }}>
                  {formatEuro(
                    bankRows
                      .filter((r) => r.account === "spaar")
                      .reduce(
                        (s, r) =>
                          s +
                          Number(r.inAmount || 0) -
                          Number(r.outAmount || 0),
                        0
                      )
                  )}
                </div>
              </div>

              <div
                style={{
                  background: "#0f172a",
                  color: "white",
                  padding: 10,
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8 }}>Totaal</div>
                <div style={{ fontWeight: "bold" }}>
                  {formatEuro(totals.bankBalance)}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === "debtors" && (
          <SectionCard title="Debiteuren / openstaande facturen">
            <Table
              headers={["Factuurnr", "Klant", "Datum", "Bedrag", "Status"]}
              rows={invoices
                .filter((i) => !i.paid)
                .map((i) => [
                  i.invoiceNumber,
                  customerById[i.customerId]?.name || i.customerId,
                  i.date,
                  formatEuro(i.amount),
                  "Openstaand",
                ])}
            />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
