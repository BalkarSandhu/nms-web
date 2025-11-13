import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchWorkers } from '@/store/workerSlice';
import { isDataStale } from '@/lib/auth';
import Header from './local-components/header';
import WorkersTable from './local-components/table';
import { WorkerDetailsSidebar } from './local-components/WorkerDetailsSidebar';
import { LoadingPage } from '@/components/loading-screen';

export default function WorkersPage() {
    const dispatch = useAppDispatch();
    const { loading, error, workers, lastFetched } = useAppSelector(state => state.workers);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

    useEffect(() => {
        // Only fetch if workers are not loaded OR data is stale (older than 5 minutes)
        if (!workers || workers.length === 0 || isDataStale(lastFetched)) {
            dispatch(fetchWorkers({}));
        }
    }, [dispatch, workers, lastFetched]);

    if (loading && workers.length === 0) {
        return <LoadingPage />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Workers</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <WorkersTable 
                    onRowClick={(workerId: string) => setSelectedWorkerId(workerId)}
                    selectedWorkerId={selectedWorkerId}
                />
            </div>

            {/* Sidebar */}
            <WorkerDetailsSidebar 
                workerId={selectedWorkerId}
                onClose={() => setSelectedWorkerId(null)}
            />
        </div>
    );
}
