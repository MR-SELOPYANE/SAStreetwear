declare module "@paystack/inline-js" {
  type Callbacks = {
    onSuccess?: (tx: { id: number; reference: string; message: string }) => void;
    onCancel?: () => void;
    onError?: (err: { message: string }) => void;
    onLoad?: (res: unknown) => void;
  };
  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: Callbacks): unknown;
    newTransaction(options: Record<string, unknown> & Callbacks): unknown;
  }
}
