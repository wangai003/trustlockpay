import LenderHeader from "@/components/lender/LenderHeader";
import FlashVetChat from "@/components/lender/FlashVetChat";

const LenderFlashVet = () => (
  <div>
    <LenderHeader title="FlashVet AI" />
    <div className="p-4 sm:p-6">
      <div className="h-[calc(100dvh-10rem)] min-h-[500px]">
        <FlashVetChat />
      </div>
    </div>
  </div>
);

export default LenderFlashVet;
