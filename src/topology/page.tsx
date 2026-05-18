import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import TopologyEditor from "./TopologyEditor";
import DevicesPage from "@/devices/page";
import LocationsPage from "@/locations/page";
import { useAreaView } from "@/contexts/AreaViewContext";

export default function Page() {
  const { view, tableKind, setView } = useAreaView();
  const navigate = useNavigate();
  const area = new URLSearchParams(useLocation().search).get("area");

  // Drilling into a (different) area always starts on the Table view.
  const lastAreaRef = useRef<string | null>(null);
  useEffect(() => {
    if (area && area !== lastAreaRef.current) {
      lastAreaRef.current = area;
      setView("table");
    }
    if (!area) lastAreaRef.current = null;
  }, [area, setView]);

  // No area scope → the all-areas summary / cluster (handled by editor).
  if (!area) {
    return <TopologyEditor />;
  }

  // Topology graph — only when explicitly opened via the table's Map icon.
  if (view === "topology") {
    return <TopologyEditor nodeKind={tableKind} />;
  }

  // Default for an area: scoped table (Devices / Locations).
  // Back arrow → dashboard; Map icon → topology (handled in PageHeader).
  const back = () => navigate("/");
  const showTopology = () => setView("topology");
  return tableKind === "devices" ? (
    <DevicesPage onBack={back} onShowTopology={showTopology} />
  ) : (
    <LocationsPage onBack={back} onShowTopology={showTopology} />
  );
}
