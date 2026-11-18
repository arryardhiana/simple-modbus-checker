import { useState } from "react";
import { useModbus } from "@/hooks/useModbus";
import { RegisterDef } from "@/types/modbus";
import { Header } from "@/components/Header";
import { ConnectionCard } from "@/components/ConnectionCard";
import { RegistersSection } from "@/components/RegistersSection";
import { RegisterDialog } from "@/components/RegisterDialog";
import { WriteDialog } from "@/components/WriteDialog";

export function App() {
  const {
    config,
    ports,
    values,
    errors,
    history,
    wsConnected,
    isConnecting,
    loadPorts,
    saveConnection,
    toggleConnect,
    saveRegister,
    deleteRegister,
    writeRegister,
  } = useModbus();

  // Dialog states
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<RegisterDef | null>(null);

  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [writingRegister, setWritingRegister] = useState<RegisterDef | null>(null);

  const handleOpenAdd = () => {
    setSelectedRegister(null);
    setRegisterDialogOpen(true);
  };

  const handleOpenEdit = (reg: RegisterDef) => {
    setSelectedRegister(reg);
    setRegisterDialogOpen(true);
  };

  const handleOpenWrite = (reg: RegisterDef) => {
    setWritingRegister(reg);
    setWriteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors">
      <Header config={config} wsConnected={wsConnected} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <ConnectionCard
          connection={config?.connection}
          ports={ports}
          connected={Boolean(config?.connected)}
          isConnecting={isConnecting}
          onRefreshPorts={loadPorts}
          onToggleConnect={toggleConnect}
          onSaveConnection={saveConnection}
        />

        <RegistersSection
          registers={config?.registers || []}
          values={values}
          errors={errors}
          history={history}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={deleteRegister}
          onWrite={handleOpenWrite}
        />
      </main>

      <RegisterDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        register={selectedRegister}
        onSave={saveRegister}
      />

      <WriteDialog
        open={writeDialogOpen}
        onOpenChange={setWriteDialogOpen}
        register={writingRegister}
        currentValue={writingRegister ? values[writingRegister.id] : null}
        onWrite={writeRegister}
      />
    </div>
  );
}

export default App;
