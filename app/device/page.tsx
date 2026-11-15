import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DeviceExperience } from "@/components/device/device-experience";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getCircle, listReadings } from "@/lib/data";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Home Station",
  description:
    "An interactive 3D prototype of the Tend Home Station: one simple device for blood pressure, blood oxygen, temperature and weight, with spoken guidance.",
};

export default async function DevicePage() {
  const session = await getSession();
  const [circle, readings] = session
    ? await Promise.all([getCircle(session.circleId), listReadings(session.circleId, 40)])
    : [null, []];
  const home = circle ? "/circle" : "/";

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-5">
        <Wordmark href={home} />
        <Link href={home} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden="true" />
          {circle ? "Family" : "Home"}
        </Link>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 pb-14">
        <div className="max-w-[46rem]">
          <h1 className="text-[2.2rem] font-extrabold sm:text-[2.8rem]">Tend Home Station</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            One small device for the whole home: blood pressure, blood oxygen, temperature and
            weight, with large buttons and a voice that explains every step. This is a working
            digital prototype. The readings are simulated and it is not a medical device.
          </p>
        </div>
        <DeviceExperience elderName={circle?.elder_name ?? null} initialReadings={readings} />
      </main>
    </>
  );
}
