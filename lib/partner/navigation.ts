/** Only a local protected portal path is a valid post-login destination. */
export function safePortalNext(value:string|null|undefined):string {
  if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/partner';
  try{const url=new URL(value,'https://portal.invalid');if(url.origin!=='https://portal.invalid'||!/^\/(partner|driver|admin)(\/|$)/.test(url.pathname))return '/partner';return url.pathname+url.search+url.hash;}catch{return '/partner';}
}

export function loginErrorMessage(code:string|null|undefined):string|null {
  const messages:Record<string,string>={
    access_denied:"Accès refusé. Ce compte n’a pas accès à cette section.",
    link_expired:"Ce lien de connexion n’est plus valable. Demandez un nouveau lien ou utilisez votre mot de passe.",
    no_code:"Ce lien de connexion est incomplet. Ouvrez le lien reçu par courriel ou demandez-en un nouveau.",
    auth_failed:"La connexion n’a pas pu être confirmée. Demandez un nouveau lien ou utilisez votre mot de passe."
  };
  return messages[code??'']??null;
}
