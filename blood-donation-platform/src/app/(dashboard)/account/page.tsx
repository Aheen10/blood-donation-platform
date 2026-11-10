import AccountForm from "@/components/account/AccountForm";

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-6">
      <h1 className="text-2xl font-bold">My Account</h1>
      <p className="text-sm text-gray-600">Update your personal information or change your password.</p>
      <AccountForm />
    </div>
  );
}