export class WorkloadBundleAdmissionRejectedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WorkloadBundleAdmissionRejectedError";
  }
}
