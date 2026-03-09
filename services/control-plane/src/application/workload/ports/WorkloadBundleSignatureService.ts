import type { SignedWorkloadBundle } from "../../../domain/workload/SignedWorkloadBundle.js";
import type { WorkloadBundle } from "../../../domain/workload/WorkloadBundle.js";

export interface WorkloadBundleSignatureService {
  sign(bundle: WorkloadBundle): SignedWorkloadBundle;
  verify(bundle: SignedWorkloadBundle): boolean;
}
