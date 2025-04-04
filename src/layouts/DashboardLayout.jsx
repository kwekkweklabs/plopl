import { CHAINS } from '@/config';
import { useDashboard } from '@/providers/DashboardProvider';
import { Button, Popover, PopoverContent, PopoverTrigger, Select, SelectItem } from '@heroui/react';
import { HomeIcon, PlusCircleIcon, SearchIcon } from 'lucide-react';
import React, { useState } from 'react'
import { Outlet, Link, useLocation, NavLink } from 'react-router-dom'

export default function DashboardLayout() {
  const location = useLocation();
  const { chain, setChain } = useDashboard()

  const [isOpenChainSelector, setIsOpenChainSelector] = useState(false);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        {/* Logo area */}
        <div className="p-4 flex items-center">
          <img src="/logo.png" alt="Plopl Logo" className="w-[10rem]" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6">
          <ul className="space-y-4">
            <li>
              <NavLink
                to="/dashboard/home"
                className={({ isActive }) =>
                  `flex items-center p-4 rounded-full transition-all font-light duration-200 ${isActive ? 'bg-primary-100 text-primary-600 font-medium shadow-sm' : 'hover:bg-gray-100'}`
                }
              >
                <HomeIcon className='w-5 h-5 mr-3' />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/explore"
                className={({ isActive }) =>
                  `flex items-center p-4 rounded-full transition-all font-light  duration-200 ${isActive ? 'bg-primary-100 text-primary-600 font-medium shadow-sm' : 'hover:bg-gray-100'}`
                }
              >
                <SearchIcon className='w-5 h-5 mr-3' />
                Explore
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/create-schema"
                className={({ isActive }) =>
                  `flex items-center p-4 rounded-full transition-all font-light  duration-200 ${isActive ? 'bg-primary-100 text-primary-600 font-medium shadow-sm' : 'hover:bg-gray-100'}`
                }
              >
                <PlusCircleIcon className='w-5 h-5 mr-3' />
                Create Schema
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/notebooks"
                className={({ isActive }) =>
                  `flex items-center p-4 rounded-full transition-all font-light  duration-200 ${isActive ? 'bg-primary-100 text-primary-600 font-medium shadow-sm' : 'hover:bg-gray-100'}`
                }
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Notebooks
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Settings at bottom */}
        <div className="p-4 border-t border-gray-200">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `flex items-center p-4 rounded-full transition-all font-light  duration-200 ${isActive ? 'bg-primary-100 text-primary-600 font-medium shadow-sm' : 'hover:bg-gray-100'}`
            }
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </NavLink>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <Popover
            isOpen={isOpenChainSelector}
            onOpenChange={setIsOpenChainSelector}
          >
            <PopoverTrigger>
              <Button
                variant='bordered'
                className='border'
                size='lg'
              >
                <div className='flex items-center gap-2'>
                  <img src={chain.logo} alt={chain.name} className='w-5 h-5 rounded-full object-cover' />
                  <span>{chain.name}</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className='flex flex-col gap-1'>
                {CHAINS.map((chain, index) => {
                  return (
                    <Button
                      key={index}
                      onPress={() => {
                        setChain(chain)
                        setIsOpenChainSelector(false)
                      }}
                      className='w-full bg-transparent'
                    >
                      <div className='w-full flex flex-row items-center gap-2'>
                        <img src={chain.logo} alt={chain.name} className='w-5 h-5 rounded-full object-cover' />
                        {chain.name}
                      </div>
                    </Button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <div>
            <Button
              color='primary'
              radius='full'
              size='lg'
            >
              <PlusCircleIcon />
              Create Schema
            </Button>
          </div>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
