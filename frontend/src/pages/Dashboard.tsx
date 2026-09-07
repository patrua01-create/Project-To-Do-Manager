import { AppLayout } from '../components/Layout/AppLayout.js';
import { TaskList } from '../components/Tasks/TaskList.js';

export function Dashboard() {
  return (
    <AppLayout>
      <TaskList />
    </AppLayout>
  );
}
