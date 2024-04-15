use hdk::prelude::*;
#[allow(unused_imports)]
use snapmail_model::*;


///
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SnapmailSignal {
    from: AgentPubKey,
    kind: String,
    payload: SignalProtocol,
}

impl SnapmailSignal {
    pub fn new(from: AgentPubKey, payload: SignalProtocol) -> Self {
        let kind = payload.kind().to_string();
        Self { from, kind, payload }
    }
}



#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SignalProtocol {
    ReceivedMail(MailItem),
    ReceivedAck(ActionHash), // for_mail ah
    ReceivedFile(FileManifest),
}


impl SignalProtocol {
    pub fn kind(&self) -> &str {
        return match &self {
            SignalProtocol::ReceivedMail(_) => "ReceivedMail",
            SignalProtocol::ReceivedAck(_) => "ReceivedAck",
            SignalProtocol::ReceivedFile(_) => "ReceivedFile",
        }
    }
}
