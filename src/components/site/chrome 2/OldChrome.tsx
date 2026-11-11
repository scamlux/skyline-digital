import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Loader } from "@/components/ui/Loader";

/**
 * Каркас «старого» дизайна — дословно тот фрагмент, что раньше жил в
 * `[locale]/layout.tsx`. Не менять: вариант `old` обязан выглядеть как прод.
 */
export function OldChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Loader />
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
