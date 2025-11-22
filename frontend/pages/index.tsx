import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
            <Head>
                <title>Live Stream Pro</title>
                <meta name="description" content="Professional Live Streaming Platform" />
            </Head>

            <main className="text-center">
                <h1 className="text-6xl font-bold text-primary mb-4">
                    Live Stream Pro
                </h1>
                <p className="text-2xl mb-8">
                    Professional Streaming for Everyone
                </p>

                <div className="flex gap-4 justify-center">
                    <Link href="/admin/dashboard" className="px-6 py-3 bg-primary rounded-lg font-bold hover:bg-red-700 transition">
                        Admin Login
                    </Link>
                    <Link href="/client/login" className="px-6 py-3 bg-gray-800 rounded-lg font-bold hover:bg-gray-700 transition">
                        Client Portal
                    </Link>
                </div>
            </main>
        </div>
    )
}
