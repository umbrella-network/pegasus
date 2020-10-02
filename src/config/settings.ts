type Settings = {
  port: number
}

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000')
}

export default settings;
