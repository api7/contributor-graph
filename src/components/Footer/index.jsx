import React from 'react';
import Email from '@material-ui/icons/Email';

import './style.css'

const App = () => {

  const footerLinks = [
    {
      label: 'Twitter',
      icon: <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1.25em" width="1.25em" xmlns="http://www.w3.org/2000/svg"><path width='1.8em' height='1.8em' d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path></svg>,
      href: 'https://twitter.com/API7ai'
    },
    {
      label: 'Email',
      icon: <Email />,
      href: 'mailto:support@api7.ai'
    },
    {
      label: 'Github',
      icon: <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 496 512" height="1.25em" width="1.25em" xmlns="http://www.w3.org/2000/svg"><path width='1.8em' height='1.8em' d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"></path></svg>,
      href: 'https://github.com/api7/contributor-graph'
    }
  ];

  const CardBox = () => (
    <>
      <div className='cardBoxTitle'>Sponsored by
        <a href="https://api7.ai" target='_blank'>
          <span>API7.ai</span>
        </a>
      </div>
      <a href='https://api7.ai/' target='_blank' style={{
        color: '#ffffff',
        textDecoration: 'none',
        background: 'url(https://pbs.twimg.com/profile_banners/1471361948562628608/1646228410/1500x500)',
        backgroundSize: 'cover',
        backgroundPosition: 'bottom',
        borderRadius: '4px',
      }}>
        <div
          style={{
            display: 'flex',
            width: '430px',
            height: '150px',
            justifyContent: 'space-between',
            alignContent: 'center',
            border: '1px solid',
            borderRadius: '4px',
            overflow: 'hidden',
            padding: '0 10px',
          }}>
          <div
            style={{
              width: '40%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img style={{ width: '100%' }} src="https://static.apiseven.com/202108/1640917868852-37633689-5279-48d6-a13a-189054e4d15b.png" alt="" />
          </div>
          <div
            style={{
              width: '55%',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-end',
            }}
          >
            <p style={{ color: '#4B5563', margin: '20px 0 13px 0', fontSize: '14px', lineHeight: '1.4' }}>Full Traffic Management: API Gateway & Kubernetes Ingress Controller & Service Mesh</p>
          </div>
        </div>
      </a>
      <div className='linkBox'>
        <ul>
          <a href="https://api7.ai/blog"><li>Blog</li></a>
          <a href="https://api7.ai/usercases"><li>Success Stories</li></a>
          <a href="https://api7.ai/about"><li>About</li></a>
          <a href="https://handbook.api7.ai/story"><li>Story</li></a>
        </ul>
      </div>
    </>
  );

  return (
    <>
      <CardBox />
      <div
        style={{
          width: '100%',
          height: 'auto',
          display: 'flex',
          justifyContent: 'center',
          margin: '1.5rem 0 0',
        }}
      >
        <div
          className='footbox'
          style={{
            width: '65%',
            display: 'flex',
            justifyContent: "space-between",
            alignItems: 'center',
            padding: '0.5rem 0.75rem',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                color: '#4B5563',
                fontWeight: 500,
              }}
            >
              The GitHub Contributor Histroy Graph
            </span>
            {
              footerLinks.map((item) => {
                return (
                  <a
                    className='leftbottomtext'
                    target='_blank'
                    key={item.label}
                    href={item.href}
                    style={{
                      color: '#4b5563',
                      marginLeft: '0.75rem',
                      display: 'flex',
                    }}
                  >{item.icon}</a>
                )
              })
            }
          </div>
          <div style={{ display: 'flex' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#4b5563',
              }}
            >
              Sponsored by
              <a
                className='rightbottomtext'
                target='_blank'
                href='https://api7.ai'
                style={{
                  fontWeight: '700',
                  color: 'rgb(59 130 246)',
                  textDecoration: 'none',
                  padding: '0 4px'
                }}
              >API7.ai</a>
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
