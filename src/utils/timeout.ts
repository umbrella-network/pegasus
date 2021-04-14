class Timeout {
  delaySeconds: number;
  timeout?: NodeJS.Timeout;
  callback: () => void;

  constructor(delaySeconds: number, callback: () => void) {
    this.delaySeconds = delaySeconds;
    this.callback = callback;
    this.reschedule();
  }

  reschedule(delaySeconds: number = this.delaySeconds): void {
    this.cancel();
    this.delaySeconds = delaySeconds;
    this.timeout = setTimeout(this.callback, delaySeconds * 1000);
  }

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export default Timeout;
