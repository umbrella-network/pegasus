type Settings = {
  port: number,
  redis: {
    url: string
  }
}

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  redis: {
    url: (process.env.REDIS_URL || 'redis://127.0.0.1:6379')
  }
}

export default settings;
