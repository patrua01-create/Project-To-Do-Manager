import styles from './FilterBar.module.css';

interface FilterBarProps {
  status: string | null;
  onStatusChange: (status: string | null) => void;
  priority: string | null;
  onPriorityChange: (priority: string | null) => void;
  dueDateFilter: string;
  onDueDateFilterChange: (filter: string) => void;
}

export function FilterBar({
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dueDateFilter,
  onDueDateFilterChange,
}: FilterBarProps) {
  const hasActiveFilters = status || priority || dueDateFilter !== 'ALL';

  return (
    <div className={styles.container}>
      <div className={styles.filterRow}>
        {/* Status Filter */}
        <div className={styles.filterGroup}>
          <label className={styles.label}>
            Status:
          </label>
          <select
            value={status || ''}
            onChange={(e) => onStatusChange(e.target.value || null)}
            className={styles.select}
          >
            <option value="">All</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className={styles.filterGroup}>
          <label className={styles.label}>
            Priority:
          </label>
          <select
            value={priority || ''}
            onChange={(e) => onPriorityChange(e.target.value || null)}
            className={styles.select}
          >
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        {/* Due Date Filter */}
        <div className={styles.filterGroup}>
          <label className={styles.label}>
            Due Date:
          </label>
          <select
            value={dueDateFilter}
            onChange={(e) => onDueDateFilterChange(e.target.value)}
            className={styles.select}
          >
            <option value="ALL">All</option>
            <option value="OVERDUE">Overdue</option>
            <option value="TODAY">Today</option>
            <option value="NEXT_7_DAYS">Next 7 Days</option>
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            onStatusChange(null);
            onPriorityChange(null);
            onDueDateFilterChange('ALL');
          }}
          className={styles.clearButton}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
