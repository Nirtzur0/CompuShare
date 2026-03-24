import { createOperationsRunbookCatalog } from "../../src/domain/operations/OperationsRunbookCatalog.js";
import { OperationsIndexScreen } from "../../src/interfaces/react/OperationsIndexScreen.js";

export default function OperationsPage() {
  return (
    <OperationsIndexScreen
      initialCatalog={createOperationsRunbookCatalog()}
    />
  );
}
