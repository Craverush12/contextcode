import WelcomPage from "../../components/Pages/WelcomPage";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Welcome to Velocity",
  description: "Craft Better Prompts with Velocity",
};

export default function Page() {
  return (
    <>
      <Navbar />
      <div className="">
        <WelcomPage />
      </div>
      <Footer />
    </>
  );
}
