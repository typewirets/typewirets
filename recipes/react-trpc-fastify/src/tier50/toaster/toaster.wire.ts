import { typeWireOf } from "@typewirets/core";
import { toast } from "sonner";
import type { ToasterService } from "./toaster.service";

export const ToasterWire = typeWireOf({
  token: "Toaster",
  creator(): ToasterService {
    return toast satisfies ToasterService;
  },
});
