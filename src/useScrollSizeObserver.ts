import { MaybeRef, onUnmounted, ref, toRef, watch,} from "vue";

export class ScrollSizeObserverEntry {
  constructor(
    readonly target: Element,
    readonly scrollWidth: number,
    readonly scrollHeight: number,
    readonly previousScrollWidth: number,
    readonly previousScrollHeight: number
  ) {}
}

export interface ScrollSizeObserverOptions {
  scrollWidth?: boolean;
  scrollHeight?: boolean;
}

export type ScrollSizeObserverCallback = (entries: ScrollSizeObserverEntry[], observer: ScrollSizeObserver) => void;

export class ScrollSizeObserver {
  private resizeObserver = new ResizeObserver((entries) => {
    this.checkChange(entries.map((entry) => entry.target.parentElement as Element));
  });

  private mutationObserver = new MutationObserver((records) => {
    let shouldCallCheckChange = true;

    for (const record of records) {
      if (record.type !== "childList") continue;

      for (const addedNode of record.addedNodes) {
        if (!(addedNode instanceof Element)) continue;

        this.resizeObserver.observe(addedNode);

        shouldCallCheckChange = false;
      }

      for (const removedNode of record.removedNodes) {
        if (!(removedNode instanceof Element)) continue;

        this.resizeObserver.unobserve(removedNode);
      }
    }

    if (shouldCallCheckChange) {
      this.checkChange(records.map((record) => record.target as Element));
    }
  });

  private observations = new Map<
    Element,
    {
      observeScrollWidth: boolean;
      observeScrollHeight: boolean;
      previousScrollWidth: number;
      previousScrollHeight: number;
    }
  >();

  constructor(private callback: ScrollSizeObserverCallback) {}

  observe(target: Element, options: ScrollSizeObserverOptions = {}) {
    const { scrollWidth: observeScrollWidth = true, scrollHeight: observeScrollHeight = true } = options;

    for (const child of target.children) {
      this.resizeObserver.observe(child);
    }

    this.mutationObserver.observe(target, { childList: true });

    const { scrollWidth, scrollHeight } = target;
    this.observations.set(target, {
      observeScrollWidth,
      observeScrollHeight,
      previousScrollWidth: scrollWidth,
      previousScrollHeight: scrollHeight,
    });

    const entry = new ScrollSizeObserverEntry(target, scrollWidth, scrollHeight, scrollWidth, scrollHeight);
    this.callback([Object.freeze(entry)], this);
  }

  unobserve(target: Element) {
    const observation = this.observations.get(target);
    if (!observation) return;

    for (const child of target.children) {
      this.resizeObserver.unobserve(child);
    }

    this.observations.delete(target);

    this.mutationObserver.disconnect();
    for (const target of this.observations.keys()) {
      this.mutationObserver.observe(target);
    }
  }

  disconnect() {
    for (const target of this.observations.keys()) {
      this.observations.delete(target);
    }

    this.mutationObserver.disconnect();
    this.resizeObserver.disconnect();
  }

  private checkChange(targets: Element[]) {
    targets = [...new Set(targets)];

    const entries: ScrollSizeObserverEntry[] = [];

    for (const target of targets) {
      const observation = this.observations.get(target);
      if (!observation) continue;

      const { observeScrollWidth, observeScrollHeight, previousScrollWidth, previousScrollHeight } = observation;

      const { scrollWidth, scrollHeight } = target;

      const scrollWidthChanged = previousScrollWidth !== scrollWidth;
      const scrollHeightChanged = previousScrollHeight !== scrollHeight;

      observation.previousScrollWidth = scrollWidth;
      observation.previousScrollHeight = scrollHeight;

      if ((observeScrollWidth && scrollWidthChanged) || (observeScrollHeight && scrollHeightChanged)) {
        const entry = new ScrollSizeObserverEntry(target, scrollWidth, scrollHeight, previousScrollWidth, previousScrollHeight);
        entries.push(Object.freeze(entry));
      }
    }

    if (entries.length) {
      this.callback(entries, this);
    }
  }
}

export const useScrollSizeObserver = (target: MaybeRef<HTMLElement | null | undefined>) => {
  const targetRef = toRef(target);

  const previousScrollHeight = ref(0);
  const scrollHeight = ref(0);
  const previousScrollWidth = ref(0);
  const scrollWidth = ref(0);

  const observer: ScrollSizeObserver = new ScrollSizeObserver((entries, _observer) => {
    previousScrollHeight.value = entries[0].previousScrollHeight;
    scrollHeight.value = entries[0].scrollHeight;
    previousScrollWidth.value = entries[0].previousScrollWidth;
    scrollWidth.value = entries[0].scrollWidth;
  });

  watch(targetRef, () => {
    if (!!targetRef.value) {
      observer.observe(targetRef.value, {});
    }
  });

  onUnmounted(() => {
    observer.disconnect();
  });

  return {
    observer,
    previousScrollHeight,
    scrollHeight,
    previousScrollWidth,
    scrollWidth,
  };
};
