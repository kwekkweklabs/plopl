import { PlusIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="space-y-6">
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
            <PlusIcon />
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
    </div>
  )
}
