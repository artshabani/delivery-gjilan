"use client";

import SnowfallLib from "react-snowfall";

export default function Snowfall() {
	return (
		<SnowfallLib
			snowflakeCount={30}
			speed={[0.4, 1.0]}
			style={{
				position: "fixed",
				inset: 0,
				pointerEvents: "none",
				zIndex: 50,
			}}
		/>
	);
}
