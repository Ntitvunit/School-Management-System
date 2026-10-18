import CheckResultForm from "./CheckResultForm";

export const metadata = { title: "Check result" };

export default function CheckResult() {
  return (
    <main className="page" style={{ maxWidth: 1000 }}>
      <CheckResultForm />
    </main>
  );
}
