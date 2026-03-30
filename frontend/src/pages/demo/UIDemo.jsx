import React, { useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import StatusBadge from '../../components/shared/StatusBadge';
import SearchBar from '../../components/shared/SearchBar';
import EmptyState from '../../components/shared/EmptyState';
import { Save, Plus, Trash2 } from 'lucide-react';

const UIDemo = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const addToast = useToast();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const tableData = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', role: 'ADMIN', status: 'ACTIVE' },
    { id: 2, name: 'Bob Jones', email: 'bob@example.com', role: 'STUDENT', status: 'PENDING' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'PROFESSOR', status: 'INACTIVE' },
  ];

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const handleTestLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <PageWrapper title="UI Components Demo">
      <div className="flex flex-col gap-8 pb-12">
        <p className="text-slate-600 mb-4">
          This is a temporary page to verify all components against the DESIGN_SYSTEM.md specification.
        </p>

        {/* Buttons */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Buttons</h2>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Button variant="primary" icon={Plus}>With Icon</Button>
            <Button variant="secondary" icon={Save}>Save</Button>
            <Button variant="danger" icon={Trash2}>Delete</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small (sm)</Button>
            <Button size="md">Medium (md)</Button>
            <Button size="lg">Large (lg)</Button>
            <Button loading>Loading...</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Badges</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="success">Success</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </div>
          <h3 className="text-sm font-semibold mb-2">StatusBadge Shared Component</h3>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="ADMITTED" />
            <StatusBadge status="PENDING" />
            <StatusBadge status="REJECTED" />
            <StatusBadge status="ON_LEAVE" />
          </div>
        </section>

        {/* Forms */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Form Elements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <Input label="Standard Input" placeholder="Enter text..." />
            <Input label="Input with Error" error="This field is required" defaultValue="Wrong value" />
            <Input label="Disabled Input" disabled value="Cannot change me" />
            <Select 
              label="Select Dropdown" 
              placeholder="Select an option"
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' },
                { value: '3', label: 'Option 3' },
              ]}
            />
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Search Bar Component</label>
              <SearchBar placeholder="Search users, students..." onSearch={(v) => console.log('Search:', v)} />
            </div>
          </div>
        </section>

        {/* Cards & Loaders */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Cards & Feedback</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <h3 className="font-bold mb-2">Standard Card</h3>
              <p className="text-sm text-slate-600">This is a standard card with default padding and shadows.</p>
            </Card>
            <Card clickable onClick={() => addToast('Card clicked!', 'info')}>
              <h3 className="font-bold mb-2">Clickable Card</h3>
              <p className="text-sm text-slate-600">Hover over me, I elevate! Click me for a toast.</p>
            </Card>
            <Card padding={false}>
              <div className="bg-slate-100 p-4 border-b"><h3 className="font-bold">No Padding Card</h3></div>
              <div className="p-4"><p className="text-sm">Useful for custom layouts inside cards.</p></div>
            </Card>
          </div>

          <div className="flex items-center gap-6">
            <Button onClick={() => addToast('Operation successful!', 'success')}>Toast Success</Button>
            <Button variant="danger" onClick={() => addToast('Connection failed!', 'error')}>Toast Error</Button>
            <Button variant="secondary" onClick={() => addToast('Update available', 'warning')}>Toast Warning</Button>
            
            <div className="flex items-center gap-4 ml-8 border-l pl-8">
              <span className="text-sm font-medium">Spinners:</span>
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </section>

        {/* Table & Modals */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Complex Components</h2>
          <div className="mb-4">
            <Button onClick={() => setModalOpen(true)}>Open Modal Window</Button>
            <Button className="ml-4" variant="secondary" onClick={handleTestLoading}>
              Test Table Loading State
            </Button>
          </div>

          <Card padding={false}>
            <Table 
              columns={columns} 
              data={tableData} 
              loading={loading}
              onRowClick={(row) => addToast(`Clicked on ${row.name}`, 'info')}
            />
            <Pagination 
              currentPage={page} 
              totalPages={5} 
              onPageChange={setPage} 
            />
          </Card>
          
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-4">Empty State Component</h3>
            <Card>
              <EmptyState 
                title="No Users Found" 
                message="Your search didn't match any users in the system." 
                action={<Button size="sm">Clear Search</Button>}
              />
            </Card>
          </div>
        </section>

        {/* Modal instance */}
        <Modal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          title="Create New User"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { addToast('User created', 'success'); setModalOpen(false); }}>Save User</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600 mb-2">
              Please enter the details for the new user below.
            </p>
            <Input label="Full Name" placeholder="John Doe" />
            <Input label="Email Address" type="email" placeholder="john@example.com" />
            <Select 
              label="Role" 
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'student', label: 'Student' },
              ]}
            />
          </div>
        </Modal>

      </div>
    </PageWrapper>
  );
};

export default UIDemo;
