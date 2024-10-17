'use client'
import OptionPicker from '@/Components/CommonUi/OptionPicker'
import CreateTierTemplate from '@/Components/Packages/CreateTierTemplate'
import AddPhotoZone from '@/Components/Packages/util/addPhotoZone'
import SelectableCards from '@/Components/UserProfile/util/ProfileTabCards'
import { useAccountStatus } from '@/hooks/useAccount'
import axios from 'axios'
import { getCookie } from 'cookies-next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

const Page: React.FunctionComponent<any> = props => {
    const [componentToShow, setComponentToShow] = useState<string>('Basic')

    const { isLoggedIn, checkStatus } = useAccountStatus()

    const userToken: string = getCookie('userToken') as string
    const router = useRouter()

    //* -------------Basic Package------------
    const [basicPrice, setBasicPrice] = useState<number>(0)
    const [basicRecurring, setBasicRecurring] = useState<boolean>(false)
    const [basicAccesVideos, setBasicAccesVideos] = useState<boolean>(false)
    const [basicCoaching, setBasicCoaching] = useState<boolean>(false)
    const [basicCustomProgram, setBasicCustomProgram] = useState<boolean>(false)
    const [basicDescription, setBasicDescription] = useState<string>('')

    //* -------------Standard Package------------
    const [standardPrice, setStandardPrice] = useState<number>(0)
    const [standardRecurring, setStandardRecurring] = useState<boolean>(false)
    const [standardAccesVideos, setStandardAccesVideos] = useState<boolean>(false)
    const [standardCoaching, setStandardCoaching] = useState<boolean>(false)
    const [standardCustomProgram, setStandardCustomProgram] = useState<boolean>(false)
    const [standardDescription, setStandardDescription] = useState<string>('')

    //* -------------Premium Package------------
    const [premiumPrice, setPremoiumPrice] = useState<number>(0)
    const [premiumRecurring, setPremiumRecurring] = useState<boolean>(false)
    const [premiumAccesVideos, setPremiumAccesVideos] = useState<boolean>(false)
    const [premiumCoaching, setPremiumCoaching] = useState<boolean>(false)
    const [premiumCustomProgram, setPremiumCustomProgram] = useState<boolean>(false)
    const [premiumDescription, setPremiumDescription] = useState<string>('')

    const [packageName, setPackageName] = useState<string>('')

    const [image1, setImage1] = useState<File | null>(null)
    const [image2, setImage2] = useState<File | null>(null)
    const [image3, setImage3] = useState<File | null>(null)
    const [image4, setImage4] = useState<File | null>(null)

    const [sport, setSport] = useState<string>('')

    useEffect(() => {
        /**
         * Get user profile Data
         */
        ;(async () => {
            await checkStatus()
        })()
    }, [userToken])

    const renderComponent = () => {
        switch (componentToShow) {
            case 'Basic':
                return (
                    <>
                        <CreateTierTemplate
                            acces_videos={basicAccesVideos}
                            setAccesVideos={setBasicAccesVideos}
                            coaching_101={basicCoaching}
                            setCoaching101={setBasicCoaching}
                            custom_program={basicCustomProgram}
                            setCustomProgram={setBasicCustomProgram}
                            description={basicDescription}
                            setDescription={setBasicDescription}
                            recurring={basicRecurring}
                            setRecurring={setBasicRecurring}
                            price={basicPrice}
                            setPrice={setBasicPrice}
                        />
                    </>
                )

            case 'Standard':
                return (
                    <>
                        <CreateTierTemplate
                            acces_videos={standardAccesVideos}
                            setAccesVideos={setStandardAccesVideos}
                            coaching_101={standardCoaching}
                            setCoaching101={setStandardCoaching}
                            custom_program={standardCustomProgram}
                            setCustomProgram={setStandardCustomProgram}
                            description={standardDescription}
                            setDescription={setStandardDescription}
                            recurring={standardRecurring}
                            setRecurring={setStandardRecurring}
                            price={standardPrice}
                            setPrice={setStandardPrice}
                        />
                    </>
                )

            case 'Premium':
                return (
                    <>
                        <CreateTierTemplate
                            acces_videos={premiumAccesVideos}
                            setAccesVideos={setPremiumAccesVideos}
                            coaching_101={premiumCoaching}
                            setCoaching101={setPremiumCoaching}
                            custom_program={premiumCustomProgram}
                            setCustomProgram={setPremiumCustomProgram}
                            description={premiumDescription}
                            setDescription={setPremiumDescription}
                            recurring={premiumRecurring}
                            setRecurring={setPremiumRecurring}
                            price={premiumPrice}
                            setPrice={setPremoiumPrice}
                        />
                    </>
                )

            default:
                return <div>No matching component found</div>
        }
    }

    const createPackage = async () => {
        const formData = new FormData()
        if (image1) {
            formData.append('Photo_1', image1)
        }
        if (image2) formData.append('Photo_2', image2)
        if (image3) formData.append('Photo_3', image3)
        if (image4) formData.append('Photo_4', image4)

        if (image1 == null && image2 == null && image3 == null && image4 == null) return window.alert('please upload at least 1 image!')

        if (packageName == '') return window.alert('please enter package name!')

        if (sport == '') return window.alert('please select sport!')

        formData.append('BasicPrice', basicPrice.toString())
        formData.append('basicRecurring', basicRecurring.toString())
        formData.append('basicAccesVideos', basicAccesVideos.toString())
        formData.append('basicCoaching', basicCoaching.toString())
        formData.append('basicCustomProgram', basicCustomProgram.toString())
        formData.append('basicDescription', basicDescription)

        formData.append('StandardPrice', standardPrice.toString())
        formData.append('standardRecurring', standardRecurring.toString())
        formData.append('standardAccesVideos', standardAccesVideos.toString())
        formData.append('standardCoaching', standardCoaching.toString())
        formData.append('standardCustomProgram', standardCustomProgram.toString())
        formData.append('standardDescription', standardDescription)

        formData.append('PremiumPrice', premiumPrice.toString())
        formData.append('premiumRecurring', premiumRecurring.toString())
        formData.append('premiumAccesVideos', premiumAccesVideos.toString())
        formData.append('premiumCoaching', premiumCoaching.toString())
        formData.append('premiumCustomProgram', premiumCustomProgram.toString())
        formData.append('premiumDescription', premiumDescription)

        formData.append('PackageName', packageName)

        formData.append('Sport', sport)

        formData.append('UserPrivateToken', userToken)

        try {
            const resp = await axios.post(`${process.env.SERVER_BACKEND}/package-manager/create-package`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            if (resp.data.error == false) {
                router.replace('/account')
            }
        } catch (error) {
            console.error('Error creating package:', error)
        }
    }

    return (
        <div className="flex h-full flex-col">
            {isLoggedIn ? (
                <div className="m-auto flex lg:h-[30rem] lg:w-[50rem] xl:h-[35rem] xl:w-[65rem] 3xl:h-[50rem] 3xl:w-[80rem]">
                    <div className="flex flex-col rounded-2xl bg-[#0000005e] lg:w-[29rem] xl:w-[39rem] 3xl:w-[49rem]">
                        <div className="flex h-28 w-full">
                            <input
                                className="m-auto h-8 w-60 rounded-xl bg-[#474084] indent-3 text-white placeholder:text-white"
                                placeholder="Enter Package Name"
                                value={packageName}
                                onChange={e => setPackageName(e.target.value)}
                            />
                        </div>
                        <hr className="w-full" />
                        <div className="flex h-[75%] w-full flex-col p-5">
                            <h1 className="mt-4 text-white">Add Photos that describe best your package</h1>
                            <div className="mt-4 grid gap-4 lg:grid-cols-1 xl:grid-cols-3 3xl:grid-cols-3">
                                <AddPhotoZone setImageFile={setImage1} />
                                <AddPhotoZone setImageFile={setImage2} />
                                <AddPhotoZone setImageFile={setImage3} />
                                <AddPhotoZone setImageFile={setImage4} />
                            </div>
                        </div>
                        <hr className="w-full" />
                        <div className="flex h-[15%]">
                            <div className="m-auto mt-4 flex h-24 w-[35%] flex-col self-center">
                                <h1 className="self-center text-white">Package sport</h1>
                                <OptionPicker
                                    label="Select Sport"
                                    options={['Football', 'Basketball', 'Cricket', 'Tennis', 'Golf', 'Rugby', 'Ice Hockey', 'Athletics (Track and Field):', 'Swimming', 'Powerlifting', 'Bodybuilding', 'Other']}
                                    value={sport}
                                    onChange={value => setSport(value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="ml-auto flex flex-col rounded-2xl bg-[#0000005e] lg:w-[20rem] xl:w-[25rem] 3xl:w-[30rem]">
                        <div className="mt-12 flex justify-around">
                            <SelectableCards
                                Title="BASIC"
                                TabName="Basic"
                                setComponentToShow={setComponentToShow}
                                activeTab={componentToShow}
                                className="ml h-[3rem] w-[9rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]"
                            />
                            <SelectableCards
                                Title="STANDARD"
                                TabName="Standard"
                                setComponentToShow={setComponentToShow}
                                activeTab={componentToShow}
                                className="h-[3rem] w-[9rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]"
                            />
                            <SelectableCards
                                Title="PREMIUM"
                                TabName="Premium"
                                setComponentToShow={setComponentToShow}
                                activeTab={componentToShow}
                                className="h-[3rem] w-[9rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]"
                            />
                        </div>

                        <hr className="w-full" />
                        {renderComponent()}
                        <button
                            className="mb-8 mt-auto h-12 w-[85%] justify-center self-center rounded-xl bg-[#474084] active:bg-[#3b366c]"
                            onClick={async () => {
                                await createPackage()
                            }}
                        >
                            <h1 className="self-center text-lg text-white">Create!</h1>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex h-full w-full flex-col">
                    <h1 className="mt-[2rem] self-center text-white">Not logged In</h1>
                    <Link className="self-center" href={'/account/login-register'}>
                        <h1 className="text-white">Login!</h1>
                    </Link>
                </div>
            )}
        </div>
    )
}

export default Page
