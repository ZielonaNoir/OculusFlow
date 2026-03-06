import DashboardHeader from "@/components/DashboardHeader";
import InteractivePrompt from "@/components/InteractivePrompt";
import DashboardRecentFiles from "@/components/DashboardRecentFiles";
// import ImageSlicer from "./components/ImageSlicer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-full px-6 py-12 md:py-20 relative z-10 w-full max-w-7xl mx-auto">
      <DashboardHeader />
      <InteractivePrompt />
      <DashboardRecentFiles />
    </div>
  );
}
