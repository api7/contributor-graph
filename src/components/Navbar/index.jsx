import React from "react";

const App = () => {
	const list = [
		{
			label: <img alt="Logo" src="https://static.apiseven.com/202108/1640917868852-37633689-5279-48d6-a13a-189054e4d15b.png" width='120px' height='auto' loading="lazy" class="chakra-image css-1s16w59"></img>,
			href: '/'
		},
		{
			label: 'API Blog',
			href: 'https://api7.ai/blog',
		},
		{
			label: 'About us',
			href: 'https://api7.ai/about'

		}
	]
	const right = [
		{
			label: 'TODO',
			href: '/'
		}
	]
	return (
		<>
			<div
				style={{
					width: '100%',
					height: '3.5rem',
					backgroundColor: 'RGB(54,54,54)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					flexDirection: 'row',

				}}>
				<div
					style={{
						width: '80rem',
						height: '100%',
						display: "flex",
						justifyContent: "space-between",
						alignItems: 'center',
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: 'center',
						}}
					>
						{
							list.map((item, idx) => {
								return (
									<a
										href={item.href}
										key={idx}
										style={{
											textDecoration: 'none',
											color: 'RGB(245,245,245)',
											fontSize: '16px',
											fontWeight: '600',
											padding: '0 16px',
											height: '100%'
										}}
									>
										{item.label}
									</a>
								)
							})
						}
					</div>
					<div>
						{
							right.map((item, key) => {
								return (
									<a
										href={item.href}
										key={key}
										style={{
											textDecoration: 'none',
											color: 'RGB(245,245,245)',
											fontSize: '16px',
											fontWeight: '600'
										}}
									>
										{item.label}
									</a>
								)
							})
						}
					</div>
				</div>
			</div>
		</>
	)
}

export default App