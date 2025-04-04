import { useAuth } from "@/providers/AuthProvider"
import { shortenAddress } from "@/utils/misc"
import { Button, Popover, PopoverContent, PopoverTrigger } from "@heroui/react"
import { LogOutIcon, WalletIcon } from "lucide-react"

export default function AccountButton() {
  const { me, logout, connectedWallet } = useAuth()
  return (
    <div className='flex flex-row items-centar gap-4 z-40 relative'>
      <Popover placement='bottom'>
        <PopoverTrigger>
          <Button
            color='primary'
            variant="flat"
            className='px-2 max-h-none h-fit'
            size='lg'
            radius="full"
          >
            <div className='flex flex-row items-center gap-4 p-3'>
              <WalletIcon />
              <div>
                <div>
                  {shortenAddress(connectedWallet)}
                </div>
              </div>
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className='light'>
          <div className='flex flex-col gap-4 p-2 w-[10rem]'>
            <Button
              color='danger'
              variant='light'
              fullWidth
              size='lg'
              onPress={logout}
            >
              <div className='flex flex-row items-center justify-between gap-2 w-full'>
                <div>
                  Logout
                </div>
                <LogOutIcon />
              </div>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}