import LenderHeader from "@/components/lender/LenderHeader";
import BlockchainExplorerPanel from "@/components/shared/BlockchainExplorerPanel";

const LenderBlockchain = () => (
  <div>
    <LenderHeader title="Blockchain Explorer" />
    <div className="p-4 sm:p-6">
      <BlockchainExplorerPanel />
    </div>
  </div>
);

export default LenderBlockchain;
