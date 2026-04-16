import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatNumber, formatNumberExact } from '../../../utils/formatters';
import type { PartitionLag } from '../../../types';

interface PartitionDetailProps {
  partitions: PartitionLag[];
}

function getLagClass(lag: number): string {
  if (lag >= 10000) return 'text-red-500 font-medium';
  if (lag >= 1000) return 'text-yellow-600 font-medium';
  return 'text-green-600';
}

export function PartitionDetail({ partitions }: PartitionDetailProps) {
  const { t } = useTranslation();

  // Sort by lag descending
  const sortedPartitions = [...partitions].sort((a, b) => b.lag - a.lag);

  return (
    <div className="bg-muted/50 p-4">
      <h4 className="text-sm font-medium mb-3">
        {t('dashboard.partition.title')} ({partitions.length})
      </h4>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dashboard.partition.topic')}</TableHead>
              <TableHead>{t('dashboard.partition.partition')}</TableHead>
              <TableHead className="text-right">
                {t('dashboard.partition.currentOffset')}
              </TableHead>
              <TableHead className="text-right">
                {t('dashboard.partition.logEndOffset')}
              </TableHead>
              <TableHead className="text-right">{t('dashboard.partition.lag')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPartitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  {t('dashboard.partition.noData')}
                </TableCell>
              </TableRow>
            ) : (
              sortedPartitions.map((partition) => (
                <TableRow key={`${partition.topic}-${partition.partition}`}>
                  <TableCell className="font-medium">{partition.topic}</TableCell>
                  <TableCell>{partition.partition}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatNumberExact(partition.current_offset)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatNumberExact(partition.log_end_offset)}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${getLagClass(partition.lag)}`}>
                    {formatNumber(partition.lag)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
