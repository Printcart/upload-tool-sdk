//@ts-ignore
import EventEmitter from "events";

interface IPrintcartUploader {
  token: string;
  sideId: string;
  productId: string;
  locale?: ILocale;
  uploaderUrl?: string;
}

interface ILocale {
  heading?: string;
  dropTargetDefault?: string;
  divider?: string;
  button?: string;
}

const IFRAME_WRAPPER_ID = "pc-uploader-iframe-wrapper";
const IFRAME_ID = "pc-uploader-iframe";

class PrintcartUploader {
  #unauthToken: string;
  #entityId: string;
  #iframeUrl: string;
  #emitter: any;
  #locale?: ILocale;
  #entityType: "side" | "product";

  constructor(config: IPrintcartUploader) {
    this.#unauthToken = config.token;
    this.#entityId = config.sideId || config.productId;
    this.#entityType = config.productId ? "product" : "side";

    this.#iframeUrl = config.uploaderUrl
      ? config.uploaderUrl
      : import.meta.env.MODE === "production"
      ? "https://upload-tool.pages.dev"
      : import.meta.env.VITE_UPLOADER_URL;

    this.#emitter = new EventEmitter();
    this.#locale = config.locale;

    if (!this.#unauthToken || !this.#entityId) {
      console.warn("Missing Config Params.");

      return;
    }

    this.#initIframe();
    this.#messageEventListener();
  }

  get locale() {
    return this.#locale;
  }

  open() {
    let wrapper = document.getElementById(IFRAME_WRAPPER_ID);
    let iframe = document.getElementById(IFRAME_ID);

    const url = new URL(this.#iframeUrl);

    url.searchParams.set("token", this.#unauthToken);
    if (this.#entityType === "side") {
      url.searchParams.set("sideId", this.#entityId);
    } else if (this.#entityType === "product") {
      url.searchParams.set("productId", this.#entityId);
    }
    url.searchParams.set("parentUrl", window.location.href);

    if (!iframe || !(iframe instanceof HTMLIFrameElement) || !wrapper) {
      console.warn("Can not find iframe element.");

      return;
    }

    iframe.src = url.href;

    wrapper.style.opacity = "1";
    wrapper.style.visibility = "visible";

    this.#emit("open");
  }

  close() {
    let wrapper = document.getElementById(IFRAME_WRAPPER_ID);

    if (!wrapper) {
      console.error("Can not find iframe element");

      return;
    }

    wrapper.style.opacity = "0";
    wrapper.style.visibility = "hidden";
  }

  on(event: any, callback: any) {
    this.#emitter.on(event, callback);

    return this;
  }

  #emit(event: any, ...args: any[]) {
    this.#emitter.emit(event, ...args);
  }

  #initIframe() {
    let wrapper = document.createElement("div");

    wrapper.id = IFRAME_WRAPPER_ID;

    wrapper.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;opacity:0;visibility:hidden;z-index:99999";

    let iframe = document.createElement("iframe");

    iframe.id = IFRAME_ID;
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.style.borderWidth = "0";

    wrapper.appendChild(iframe);
    document.body.appendChild(wrapper);
  }

  #messageEventListener() {
    let wrapper = document.getElementById(IFRAME_WRAPPER_ID);

    window.addEventListener(
      "message",
      (event) => {
        if (event.origin === this.#iframeUrl) {
          if (event.data.uploaderEvent === "close" && wrapper) {
            wrapper.style.opacity = "0";
            wrapper.style.visibility = "hidden";

            this.#emit("close");
          }

          if (event.data.uploaderEvent === "upload-success") {
            this.#emit("upload-success", event.data.response, event.data.file);
          }

          if (event.data.uploaderEvent === "upload-error") {
            this.#emit("upload-error", event.data.error);
          }

          const locale = this.#locale;
          const iframe = document.getElementById(IFRAME_ID);

          if (iframe && iframe instanceof HTMLIFrameElement) {
            this.#emit("onload");

            if (event.data.uploaderEvent === "loaded") {
              console.log("test load");
            }

            if (
              locale &&
              event.data.uploaderEvent === "loaded" &&
              event.data.finished
            ) {
              console.log("test");

              iframe.focus();

              iframe.contentWindow?.postMessage(
                {
                  locale,
                },
                this.#iframeUrl
              );
            }
          }
        }
      },
      false
    );
  }
}

export default PrintcartUploader;
