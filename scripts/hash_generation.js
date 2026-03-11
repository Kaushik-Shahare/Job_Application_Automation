function normalize(text){

  if(!text) return ""

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g,"")     // remove punctuation
    .replace(/\s+/g," ")        // collapse spaces
}

function base36(num){
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""

  while(num > 0){
    const rem = num % 36
    result = chars[rem] + result
    num = Math.floor(num / 36)
  }

  return result || "0"
}

function hash3(text){

  let hash = 0

  for(let i=0;i<text.length;i++){
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }

  const num = Math.abs(hash)

  return base36(num).slice(0,3).toUpperCase()
}

const output = []

for (const item of items) {

  const job = item.json

  const jobTitle = normalize(job.title)
  const location = normalize(job.location)

  const titleCode = hash3(jobTitle)
  const locationCode = hash3(location)

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g,"")
    .slice(0,12)

  const resumeCode = `${titleCode}${locationCode}${timestamp}`

  output.push({
    json:{
      ...job,
      apply_url: job.applyUrl || "",
      linkedin_url: job.link || "",
      is_easy_apply: !job.applyUrl,
      normalized_title: jobTitle,
      normalized_location: location,
      title_code: titleCode,
      location_code: locationCode,
      resume_code: resumeCode
    }
  })
}

return output