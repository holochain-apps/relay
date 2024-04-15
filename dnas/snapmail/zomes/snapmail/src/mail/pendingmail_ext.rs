use hdk::prelude::*;
use snapmail_model::*;
use zome_utils::*;

use crate::{
   mail::utils::*,
};

// From your crate
pub trait PendingMailExt {
   fn create(mail: Mail, outmail_eh: EntryHash, sender: AgentPubKey, recipient: AgentPubKey) -> PendingMail;
   fn from_mail(mail: Mail, outmail_eh: EntryHash, to: AgentPubKey) -> ExternResult<PendingMail>;
   fn decrypt(&self, sender: AgentPubKey, recipient: AgentPubKey) -> Mail;
   fn try_into_inmail(&self, from: AgentPubKey) -> ExternResult<InMail>;
}


///
impl PendingMailExt for PendingMail {

   /// Create PendingMail from Mail and recipient's public encryption key
   /// This will encrypt the Mail with the recipient's key
   fn create(mail: Mail, outmail_eh: EntryHash, sender: AgentPubKey, recipient: AgentPubKey) -> PendingMail {
      /// Serialize
      let serialized = bincode::serialize(&mail).expect("Failed to serialize Mail");
      let data: XSalsa20Poly1305Data = serialized.into();
      /// Encrypt
      let encrypted = ed_25519_x_salsa20_poly1305_encrypt(sender.clone(), recipient.clone(), data)
         .expect("PendingMail encryption failed");
      trace!("Encrypted: {:?}", encrypted.clone());
      let signature = sign_mail(&mail).expect("Signing mail failed");
      // let me = agent_info().expect("Should have agent info").agent_latest_pubkey;
      // let signature = sign(me, mail).expect("Should be able to sign with my key");
      trace!("with:\n -    sender = {:?}\n - recipient = {:?}", sender.clone(), recipient.clone());
      /// Done
      PendingMail::new(encrypted, outmail_eh, signature)
   }


   /// Create PendingMail from Mail and recipient's public encryption key
   /// This will encrypt the Mail with the recipient's key
   /// called from post_commit()
   fn from_mail(mail: Mail, outmail_eh: EntryHash, to: AgentPubKey) -> ExternResult<PendingMail> {
      /// Get my key
      let sender_key = agent_info()?.agent_latest_pubkey;
      /// Get recipient's key
      let recipient_key = to;
      /// Create
      Ok(Self::create(mail, outmail_eh, sender_key, recipient_key))
   }


   /// Attempt to decrypt pendingMail with provided keys
   fn decrypt(&self, sender: AgentPubKey, recipient: AgentPubKey) -> Mail {
      debug!("decrypt of: {:?}", self.encrypted_mail.clone());
      debug!("with:\n -    sender = {:?}\n - recipient = {:?}", sender.clone(), recipient.clone());
      /// Decrypt
      let decrypted = ed_25519_x_salsa20_poly1305_decrypt(recipient, sender, self.encrypted_mail.clone())
      //let decrypted = ed_25519_x_salsa20_poly1305_decrypt(sender, recipient, self.encrypted_mail.clone())
          .expect("Failed decrypting mail");
      debug!("decrypt maybe_decrypted = {:?}", decrypted);
      /// Deserialize
      let mail: Mail = bincode::deserialize(decrypted.as_ref())
          .expect("Deserialization Mail failed");
      /// Done
      mail
   }


   fn try_into_inmail(&self, from: AgentPubKey) -> ExternResult<InMail> {
      let received_date = zome_utils::now();
      /// Get my key
      let recipient_key = agent_info()?.agent_latest_pubkey;
      debug!("try_into_inmail() recipient_key: {}", recipient_key);
      /// Get sender's key
      let sender_key = from.clone();
      debug!("   try_into_inmail() sender_key: {:?}", sender_key);
      /// Decrypt
      let mail = self.decrypt(sender_key, recipient_key);
      debug!("   try_into_inmail() mail: {:?}", mail);
      /// Into InMail
      let inmail = InMail::new(mail,
                        from.clone(),
                        received_date,
                        self.outmail_eh.clone(),
                        self.from_signature.clone());
      /// Check signature
      let maybe_verified = verify_signature(from, self.from_signature.clone(), inmail.mail.clone());
      match maybe_verified {
         Err(err) => {
            let response_str = "Verifying PendingMail failed";
            debug!("{}: {}", response_str, err);
            return error(response_str);
         }
         Ok(false) => {
            let response_str = "Failed verifying PendingMail signature";
            debug!("{}", response_str);
            return error(response_str);
         }
         Ok(true) => debug!("Valid PendingMail signature"),
      }
      /// Done
      Ok(inmail)
   }
}


#[hdk_extern]
fn test_encryption(recipient: AgentPubKey) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   /// Get my key
   let sender = agent_info()?.agent_latest_pubkey;
   /// Serialize
   let data: XSalsa20Poly1305Data = vec![1,2,3,74,4,85,48,7,87,89].into();
   /// Encrypt
   let encrypted = ed_25519_x_salsa20_poly1305_encrypt(sender.clone(), recipient.clone(), data)?;
   debug!("create decrypt of: {:?}\n With:", encrypted.clone());
   debug!("-    sender = {:?}", sender.clone());
   debug!("- recipient = {:?}", recipient.clone());
   /// Normal decrypt
   let maybe_decrypted = ed_25519_x_salsa20_poly1305_decrypt(recipient.clone(), sender.clone(), encrypted.clone());
   debug!("  maybe_decrypted normal = {:?}", maybe_decrypted);
   /// Inverted keys
   let maybe_decrypted = ed_25519_x_salsa20_poly1305_decrypt(sender, recipient, encrypted.clone());
   debug!("maybe_decrypted inverted = {:?}", maybe_decrypted);
   /// Done
   Ok(())
}
