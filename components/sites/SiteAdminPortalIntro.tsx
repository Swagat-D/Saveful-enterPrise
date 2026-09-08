import { StoreBadges } from "@/components/business/StoreBadges";

export function SiteAdminPortalIntro() {
  return (
    <section className="rounded-2xl border border-saveful-green/20 bg-white px-4 py-3.5 sm:px-5">
      <p className="font-saveful text-sm leading-relaxed text-gray-700">
        This is your online portal which you can view to see the Impact and Activities of your site.
      </p>
      <p className="mt-2 font-saveful text-sm leading-relaxed text-gray-700">
        To list surplus items and add team members, please{" "}
        <span className="font-saveful-semibold text-gray-900">
          Download the Saveful for Business app on your mobile device.
        </span>
      </p>
      <p className="mt-2 font-saveful text-sm leading-relaxed text-gray-700">
        All activity via the app will be registered on this online portal.
      </p>
      <div className="mt-3">
        <p className="mb-2 font-saveful-semibold text-sm text-gray-900">Download and use on your mobile device</p>
        <StoreBadges compact />
      </div>
    </section>
  );
}
