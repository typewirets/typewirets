import { TypeWireContainer, typeWireGroupOf } from "@typewirets/core";
import ReactDOM from "react-dom/client";
import { BrowserApp } from "./BrowserApp";
import { TrpcWire } from "./tier10/trpc.wire";
import { TRPCClientWire } from "./tier120/trpc.client.wire";
import { QueryClientWire } from "./tier120/react-query.client.wire";
import { ToasterWire } from "./tier50/toaster/toaster.wire";
import { AchievementStoreWire } from "./tier50/achivement/achievement.store";

async function main() {
  const rootId = "root";
  const rootEl = document.querySelector(`#${rootId}`);
  if (!rootEl) {
    throw Error(`Element #${rootId} not found`);
  }
  const container = new TypeWireContainer();
  const wireGroup = typeWireGroupOf([
    TrpcWire,
    TRPCClientWire,
    QueryClientWire,
    ToasterWire,
    AchievementStoreWire,
  ]);

  await wireGroup.apply(container);
  const root = ReactDOM.createRoot(rootEl);
  root.render(<BrowserApp container={container} />);
}

main()
  .then(() => {
    console.log("main");
  })
  .catch(console.error);
