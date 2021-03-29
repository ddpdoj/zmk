import React from "react";

import {
  Board,
  HardwareMetadata,
  Interconnect,
  Shield,
} from "../hardware-metadata";

interface HardwareListProps {
  items: HardwareMetadata[];
}

function itemIds(item: HardwareMetadata) {
  if (item.type == "board" || item.type == "shield") {
    let nodes = (item.siblings || [item.id])
      .map<JSX.Element | string>((id) => <code key={id}>{id}</code>)
      .reduce(
        (prev, curr, index) => [...prev, index > 0 ? " and " : "", curr],
        [] as Array<string | JSX.Element>
      );
    return <span key={item.id}>{nodes}</span>;
  } else {
    return <code key={item.id}>{item.id}</code>;
  }
}

function typeLabel(type: HardwareMetadata["type"]): string {
  switch (type) {
    case "board":
      return "Board: ";
    case "shield":
      return "Shield: ";
    case "interconnect":
      return "Interconnect: ";
  }
}

function HardwareLineItem({ item }: { item: HardwareMetadata }) {
  return (
    <li>
      <a href={item.url}>{item.name}</a> ({typeLabel(item.type)} {itemIds(item)}
      )
    </li>
  );
}

function mapInterconnect({
  interconnect,
  boards,
  shields,
}: {
  interconnect?: Interconnect;
  boards: Array<Board>;
  shields: Array<Shield>;
}) {
  if (!interconnect) {
    return null;
  }

  return (
    <div key={interconnect.id}>
      <h4>{interconnect.name} Keyboards</h4>
      {interconnect.description && <p>{interconnect.description}</p>}
      <h5>Boards</h5>
      <ul>
        {boards.map((s) => (
          <HardwareLineItem key={s.id} item={s} />
        ))}
      </ul>
      <h5>Shields</h5>
      <ul>
        {shields.map((s) => (
          <HardwareLineItem key={s.id} item={s} />
        ))}
      </ul>
    </div>
  );
}

function HardwareList({ items }: HardwareListProps) {
  let grouped: {
    onboard: Array<Board>;
    interconnects: {
      [key: string]: {
        interconnect?: Interconnect;
        boards: Array<Board>;
        shields: Array<Shield>;
      };
    };
  } = items.reduce(
    (agg, hm) => {
      switch (hm.type) {
        case "board":
          if (hm.features?.includes("keys")) {
            agg.onboard.push(hm);
          } else if (hm.exposes) {
            hm.exposes.forEach((element) => {
              let ic = agg.interconnects[element] || {
                boards: [],
                shields: [],
              };
              ic.boards.push(hm);
              agg.interconnects[element] = ic;
            });
          } else {
            console.error("Board without keys or interconnect");
          }
          break;
        case "shield":
          hm.requires.forEach((id) => {
            let ic = agg.interconnects[id] || { boards: [], shields: [] };
            ic.shields.push(hm);
            agg.interconnects[id] = ic;
          });
          break;
        case "interconnect":
          let ic = agg.interconnects[hm.id] || { boards: [], shields: [] };
          ic.interconnect = hm;
          agg.interconnects[hm.id] = ic;
          break;
      }
      return agg;
    },
    { onboard: [] as Array<Board>, interconnects: {} }
  );

  return (
    <>
      <h2>Keyboards</h2>
      <h3>Onboard Controller Boards</h3>
      <p>
        Keyboards with onboard controllers are single PCBs that contain all the
        components of a keyboard, including the controller chip, switch
        footprints, etc.
      </p>
      <ul>
        {grouped["onboard"]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((s) => (
            <HardwareLineItem key={s.id} item={s} />
          ))}
      </ul>
      <h3>Composite Boards</h3>
      <p>
        Composite keyboards are composed of two main PCBs: a small controller
        board with exposed pads, and a larger keyboard PCB (a shield, in ZMK
        lingo) with switch footprints and location a where the controller is
        added.
      </p>
      {Object.values(grouped.interconnects).map(mapInterconnect)}
    </>
  );
}

export default HardwareList;
