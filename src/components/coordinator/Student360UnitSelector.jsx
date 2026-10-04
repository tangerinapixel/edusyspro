/* eslint-disable react/prop-types */
import { useMemo } from 'react';
import CoordinatorFilterDropdown from './CoordinatorFilterDropdown';

/**
 * Seletor de Período Letivo / Unidade para o Dossiê 360º
 * Padronizado com o seletor premium de popovers do sistema.
 */
export default function Student360UnitSelector({
  units = [],
  selectedUnit = 'ALL',
  onSelectUnit,
  isLoading = false
}) {
  const validUnits = (units || []).filter(u => u && (u.id === 'ALL' || (Number(u.id) >= 1 && Number(u.id) <= 3)));

  const displayUnits = validUnits.length > 0
    ? validUnits
    : [
        { id: 'ALL', name: 'Todas as Unidades' },
        { id: 1, name: '1ª Unidade' },
        { id: 2, name: '2ª Unidade' },
        { id: 3, name: '3ª Unidade' }
      ];

  const unitOptions = useMemo(() => {
    return displayUnits.map(u => ({
      value: u.id,
      label: u.name,
      subtitle: u.id === 'ALL' ? 'Visão consolidada anual' : 'Período letivo oficial'
    }));
  }, [displayUnits]);

  return (
    <CoordinatorFilterDropdown
      categoryLabel="Unidade"
      color="emerald"
      value={selectedUnit}
      onChange={(val) => {
        if (typeof onSelectUnit === 'function') {
          onSelectUnit(val);
        }
      }}
      options={unitOptions}
      placeholder="Filtrar por Unidade"
      widthClass="w-60"
      disabled={isLoading}
    />
  );
}
