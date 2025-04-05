import { PlusIcon } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const [plops, setPlops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlops = async () => {
      try {
        const response = await fetch(
          'http://localhost:3710/schema/my-schemas-usage?address=0xB6c905FFA790F71eD7c0e282680380761cd75056'
        );
        if (!response.ok) {
          throw new Error('Failed to fetch plops');
        }
        const data = await response.json();
        setPlops(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPlops();
  }, []);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex justify-center">
          <div className="animate-pulse flex space-x-2">
            <div className="h-3 w-3 bg-primary rounded-full"></div>
            <div className="h-3 w-3 bg-primary rounded-full"></div>
            <div className="h-3 w-3 bg-primary rounded-full"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-red-500">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to="/dashboard/create-schema"
            className="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center inline-flex"
          >
            Create Schema
            <PlusIcon className="ml-2" />
          </Link>
        </div>
      ) : plops.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Welcome to Plopl</h2>
          <p className="text-gray-600 mb-4">
            Your dashboard is currently empty. Create your first schema or explore the platform.
          </p>

          <div className="flex gap-4 mt-4">
            <Link
              to="/dashboard/create-schema"
              className="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              Create Schema
              <PlusIcon className="ml-2" />
            </Link>

            <Link
              to="/dashboard/explore"
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Explore
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">My PLOPs</h2>
            <Link
              to="/dashboard/create-schema"
              className="bg-primary hover:bg-orange-600 text-white px-3 py-1.5 rounded-md flex items-center text-sm"
            >
              New Schema
              <PlusIcon className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {plops.map((plop) => (
              <div 
                key={plop.id} 
                className="relative overflow-hidden"
              >
                {/* Ticket background with zigzag edge */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg shadow-md overflow-hidden border border-orange-200 hover:shadow-lg transition-all duration-200">
                  
                  {/* Left perforated edge */}
                  <div className="absolute left-0 top-0 h-full w-4 flex flex-col justify-between items-center py-3">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-white border border-orange-200"></div>
                    ))}
                  </div>

                  {/* Top decoration */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-primary/10">
                    <div className="flex justify-between px-8">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="w-1 h-2 bg-primary/20"></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Ticket content */}
                  <div className="ml-6 p-5 pt-4">
                    {/* Header with chain and registry info */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center mb-1 gap-2">
                          <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded">
                            Chain {plop.schema.chainId}
                          </span>
                          <span className="text-xs text-gray-500">Registry #{plop.schema.registryId}</span>
                        </div>
                        <h3 className="font-bold text-xl text-gray-800 mb-1">{plop.schema.name}</h3>
                        <p className="text-sm text-gray-600">{plop.schema.description}</p>
                      </div>
                      
                      {/* Decorative stamp */}
                      <div className="relative ml-4">
                        <div className="absolute -top-2 -right-2 w-20 h-20 rounded-full">
                          <div className="w-16 h-16 border-4 border-dashed border-primary/40 rounded-full flex items-center justify-center transform rotate-12">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <div className="w-6 h-6 bg-primary/30 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Schema ID in a styled box */}
                    <div className="mt-3 mb-3">
                      <div className="bg-gray-50 rounded-md p-2 border border-dashed border-orange-200">
                        <p className="text-xs text-gray-500 flex items-start">
                          <span className="font-medium mr-1 mt-0.5">Schema ID:</span>
                          <span className="font-mono text-[10px] text-gray-600 break-all">{plop.schema.id}</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Separator */}
                    <div className="relative my-4">
                      <div className="absolute left-0 right-0 h-px bg-orange-200 border-t border-dashed border-orange-200"></div>
                      <div className="absolute -left-6 -ml-px top-1/2 transform -translate-y-1/2 w-3 h-6 bg-primary/10 rounded-r-full"></div>
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-6 bg-primary/10 rounded-l-full"></div>
                    </div>
                    
                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-primary/40 rounded-full mr-2"></div>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Created:</span> {new Date(plop.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-primary/40 rounded-full mr-2"></div>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Block:</span> {plop.blockNumber}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="flex items-center justify-end">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Address:</span> {plop.userAddress.slice(0, 6)}...{plop.userAddress.slice(-4)}
                          </p>
                          <div className="w-2 h-2 bg-primary/40 rounded-full ml-2"></div>
                        </div>
                        <div className="flex items-center justify-end">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Tx:</span> {plop.txHash.slice(0, 6)}...{plop.txHash.slice(-4)}
                          </p>
                          <div className="w-2 h-2 bg-primary/40 rounded-full ml-2"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom decoration */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-primary/10">
                      <div className="flex justify-between px-8">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="w-1 h-2 bg-primary/20"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
