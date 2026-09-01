import Link from "next/link";

export default function BillingCancelledPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center">
      <h1 className="font-saveful-bold text-2xl text-gray-900">Checkout cancelled</h1>
      <p className="mt-3 font-saveful text-sm text-gray-600">
        No payment was taken. You can choose a plan again when you are ready.
      </p>
      <Link href="/business/plans" className="mt-6 inline-flex h-11 items-center rounded-xl bg-saveful-green px-5 font-saveful-semibold text-white">
        Back to plans
      </Link>
    </div>
  );
}
