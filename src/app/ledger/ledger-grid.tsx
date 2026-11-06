'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ValueFormatterParams,
  type ICellRendererParams,
} from 'ag-grid-community';
import type { LedgerEntry } from '@/db/schema';
import { formatUsd } from '@/lib/money';
import { formatWhen } from '@/lib/format';
import { apiFetch } from '@/lib/api-client';
import { Badge, Button, Card, Stat } from '@/components/ui';
import { summarizeFlows } from '@/features/live/flows';

ModuleRegistry.registerModules([AllCommunityModule]);

/** Theme reads the DESIGN.md tokens from CSS variables so the grid never carries its own hex. */
const GRID_THEME = themeQuartz.withParams({
  accentColor: 'var(--accent)',
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'var(--border)',
  headerBackgroundColor: 'var(--background)',
  headerTextColor: 'var(--muted)',
  oddRowBackgroundColor: 'var(--surface)',
  rowHoverColor: 'var(--surface-raised)',
  chromeBackgroundColor: 'var(--background)',
  fontFamily: 'inherit',
  fontSize: 13,
  rowHeight: 40,
  wrapperBorderRadius: 15,
  browserColorScheme: 'dark',
});

const GRID_HEIGHT_PX = 560;

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const KIND_TONES: Record<LedgerEntry['kind'], Tone> = {
  donation_captured: 'success',
  sponsor_invoiced: 'accent',
  sponsor_paid: 'success',
  servicer_payout: 'accent',
  refund: 'warning',
  reconciled: 'neutral',
  exception: 'danger',
};

const KIND_LABELS: Record<LedgerEntry['kind'], string> = {
  donation_captured: 'Donation captured',
  sponsor_invoiced: 'Sponsor invoiced',
  sponsor_paid: 'Sponsor paid',
  servicer_payout: 'Servicer payout',
  refund: 'Refund',
  reconciled: 'Reconciled',
  exception: 'Exception',
};

function KindCell(
  params: ICellRendererParams<LedgerEntry, LedgerEntry['kind']>,
): React.ReactElement | null {
  const kind = params.value;
  if (!kind) {
    return null;
  }
  return <Badge tone={KIND_TONES[kind]}>{KIND_LABELS[kind]}</Badge>;
}

function RefCell(
  params: ICellRendererParams<LedgerEntry, string | null>,
): React.ReactElement | null {
  if (!params.value || params.node.rowPinned) {
    return params.value ? <span>{params.value}</span> : null;
  }
  return (
    <Link href={`/proof?ref=${params.value}`} className="text-accent hover:underline">
      {params.value}
    </Link>
  );
}

function formatDate(params: ValueFormatterParams<LedgerEntry, string | Date>): string {
  if (!params.value) {
    return '';
  }
  return formatWhen(params.value);
}

function formatCents(params: ValueFormatterParams<LedgerEntry, number>): string {
  return typeof params.value === 'number' ? formatUsd(params.value) : '';
}

const COLUMNS: readonly ColDef<LedgerEntry>[] = [
  { field: 'createdAt', headerName: 'When', valueFormatter: formatDate, sort: 'desc', width: 150 },
  {
    field: 'kind',
    headerName: 'Kind',
    cellRenderer: KindCell,
    cellClass: 'flex items-center',
    width: 210,
  },
  { field: 'campaignId', headerName: 'Campaign', cellClass: 'font-mono', width: 190 },
  { field: 'counterparty', headerName: 'Counterparty', width: 180 },
  {
    field: 'amountCents',
    headerName: 'Amount',
    valueFormatter: formatCents,
    type: 'rightAligned',
    width: 120,
  },
  {
    field: 'paypalRef',
    headerName: 'PayPal ref (opens proof)',
    cellClass: 'font-mono',
    cellRenderer: RefCell,
    width: 240,
  },
  { field: 'agentRunId', headerName: 'Agent run', cellClass: 'font-mono', width: 190 },
  { field: 'memo', headerName: 'Memo', flex: 1, minWidth: 240 },
];

const COLUMN_DEFS = [...COLUMNS];

const DEFAULT_COL: ColDef<LedgerEntry> = { sortable: true, filter: true, resizable: true };

const CSV_FILE = 'gradpaid-ledger.csv';

/** Bottom row that sums the visible money columns, recomputed whenever the filter changes. */
function totalsRow(rows: readonly LedgerEntry[]): Partial<LedgerEntry> {
  return {
    memo: `Total of ${rows.length} entries`,
    amountCents: rows.reduce((sum, r) => sum + r.amountCents, 0),
  };
}

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly rows: readonly LedgerEntry[] };

export function LedgerGrid(): React.ReactElement {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [quickFilter, setQuickFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetch<LedgerEntry[]>('/api/ledger').then((res) => {
      if (cancelled) {
        return;
      }
      if (res.ok && res.data) {
        setState({ status: 'ready', rows: res.data });
      } else {
        setState({ status: 'error', message: res.error ?? 'Could not load the ledger' });
      }
    });
    return (): void => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo<readonly LedgerEntry[]>(
    () => (state.status === 'ready' ? state.rows : []),
    [state],
  );
  const flows = useMemo(() => summarizeFlows(rows), [rows]);
  const rowData = useMemo(() => [...rows], [rows]);
  const grid = useRef<AgGridReact<LedgerEntry>>(null);
  const [visible, setVisible] = useState<readonly LedgerEntry[]>([]);
  const pinned = useMemo(() => [totalsRow(visible)], [visible]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Donations captured" value={formatUsd(flows.donorsPaidCents)} />
        <Stat label="Paid to servicers" value={formatUsd(flows.servicersReceivedCents)} />
        <Stat
          label="Sponsor match paid"
          value={formatUsd(flows.sponsorPaidCents)}
          hint={`${formatUsd(flows.sponsorInvoicedCents)} invoiced`}
        />
        <Stat
          label="Exceptions"
          value={String(flows.exceptions)}
          hint="Mismatches flagged by the agent"
        />
      </Card>

      <div className="flex items-center justify-between gap-4">
        <input
          type="search"
          value={quickFilter}
          onChange={(e) => setQuickFilter(e.target.value)}
          placeholder="Search any column"
          aria-label="Search ledger"
          className="w-full max-w-sm rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 font-mono text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex items-center gap-4">
          <span className="label">{rows.length} entries</span>
          <Button
            variant="secondary"
            onClick={() => grid.current?.api.exportDataAsCsv({ fileName: CSV_FILE })}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {state.status === 'error' ? (
        <Card className="text-sm text-danger">Could not load the ledger: {state.message}</Card>
      ) : null}
      {state.status === 'ready' && rows.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          No ledger entries yet. Make a donation on the Give page, then run the disbursement agent
          from the Agent console.
        </Card>
      ) : null}

      <div
        style={{ height: GRID_HEIGHT_PX }}
        className="overflow-hidden rounded-[var(--radius-card)] border border-border"
      >
        <AgGridReact<LedgerEntry>
          ref={grid}
          theme={GRID_THEME}
          pinnedBottomRowData={pinned}
          onModelUpdated={(e) => {
            const shown: LedgerEntry[] = [];
            e.api.forEachNodeAfterFilter((n) => {
              if (n.data) {
                shown.push(n.data);
              }
            });
            setVisible((prev) =>
              prev.length === shown.length && prev.every((r, i) => r === shown.at(i))
                ? prev
                : shown,
            );
          }}
          rowData={rowData}
          columnDefs={COLUMN_DEFS}
          defaultColDef={DEFAULT_COL}
          quickFilterText={quickFilter}
          loading={state.status === 'loading'}
          animateRows
          pagination
          paginationPageSize={25}
        />
      </div>
    </div>
  );
}
