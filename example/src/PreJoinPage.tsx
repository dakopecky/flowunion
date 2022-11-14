import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { createLocalVideoTrack, LocalVideoTrack } from "livekit-client";
import { AudioSelectButton, ControlButton, VideoSelectButton } from "@livekit/react-components";
import { VideoRenderer } from "@livekit/react-core";
import React, { ReactElement, useEffect, useState } from "react";
import { AspectRatio } from "react-aspect-ratio";
import { useNavigate } from "react-router-dom";
import { AccessToken } from "livekit-server-sdk";

export const PreJoinPage = () => {
  // initial state from query parameters
  // const searchParams = new URLSearchParams(window.location.search);
  // const storedUsername = searchParams.get('username') ?? '';
  // const storedRoom = searchParams.get('room') ?? '';

  // state to pass onto room
  // const [username, setUsername] = useState(storedUsername);
  // const [room, setRoom] = useState<string>(storedRoom);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  // disable connect button unless validated
  const [connectDisabled, setConnectDisabled] = useState(true);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack>();
  const [audioDevice, setAudioDevice] = useState<MediaDeviceInfo>();
  const [videoDevice, setVideoDevice] = useState<MediaDeviceInfo>();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);

  let username = React.useRef<HTMLInputElement>(null);
  let roomName = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (username && roomName) {
      setConnectDisabled(false);
    } else {
      setConnectDisabled(true);
    }
  }, [username, roomName]);

  const toggleVideo = async () => {
    if (videoTrack) {
      videoTrack.stop();
      setVideoEnabled(false);
      setVideoTrack(undefined);
    } else {
      const track = await createLocalVideoTrack({
        deviceId: videoDevice?.deviceId,
      });
      setVideoEnabled(true);
      setVideoTrack(track);
    }
  };

  useEffect(() => {
    // enable video by default
    createLocalVideoTrack({
      deviceId: videoDevice?.deviceId,
    }).then((track) => {
      setVideoEnabled(true);
      setVideoTrack(track);
    });
  }, [videoDevice]);

  const toggleAudio = () => {
    if (audioEnabled) {
      setAudioEnabled(false);
    } else {
      setAudioEnabled(true);
    }
  };

  const selectVideoDevice = (device: MediaDeviceInfo) => {
    setVideoDevice(device);
    if (videoTrack) {
      if (videoTrack.mediaStreamTrack.getSettings().deviceId === device.deviceId) {
        return;
      }
      // stop video
      videoTrack.stop();
    }
  };

  const connectToRoom = async () => {
    if (videoTrack) {
      videoTrack.stop();
    }

    // initial state from query parameters
    // const searchParams = new URLSearchParams(window.location.search);
    const url = 'ws://localhost:7880';
    // if this room doesn't exist, it'll be automatically created when the first
    // client joins
    // identifier to be used for participant.
    // it's available as LocalParticipant.identity with livekit-client SDK
    const at = new AccessToken('devkey', 'secret', {
      // @ts-ignore
      identity: username.current.value.toString(),
    });
    // @ts-ignore
    at.addGrant({ roomJoin: true, room: roomName.current.value.toString() });

    const token = at.toJwt();
    console.log('access token', at.toJwt());

    if (
      window.location.protocol === 'https:' &&
      url.startsWith('ws://') &&
      !url.startsWith('ws://localhost')
    ) {
      alert('Unable to connect to insecure websocket from https');
      return;
    }

    const params: { [key: string]: string } = {
      url,
      token,
      videoEnabled: videoEnabled ? '1' : '0',
      audioEnabled: audioEnabled ? '1' : '0',
      simulcast: '1',
      dynacast: '1',
      adaptiveStream: '1',
    };
    if (audioDevice) {
      params.audioDeviceId = audioDevice.deviceId;
    }
    if (videoDevice) {
      params.videoDeviceId = videoDevice.deviceId;
    } else if (videoTrack) {
      // pass along current device id to ensure camera device match
      const deviceId = await videoTrack.getDeviceId();
      if (deviceId) {
        params.videoDeviceId = deviceId;
      }
    }
    navigate({
      pathname: '/room',
      search: '?' + new URLSearchParams(params).toString(),
    });
  };

  let videoElement: ReactElement;
  if (videoTrack) {
    videoElement = <VideoRenderer track={videoTrack} isLocal={true} />;
  } else {
    videoElement = <div className="placeholder" />;
  }

  return (
    <div className="prejoin">
      <main>
          <h1>FlowUnion</h1>

          <a onClick={() => {if(!isOpen) setIsOpen(true); else setIsOpen(false)}}>
            <div className="ArtemNice">Login</div>
          </a>
          <div>
            {isOpen ?
              <div className="configuration">
                <div className="configuration-settings-window">
                  <div className="config1">
                    <span>Your name</span>
                    <input type="text" placeholder="Enter your name" ref={username} />
                    <span>Room name</span>
                    <input type="text" placeholder="Enter the name of the room" ref={roomName}/>
                  </div>
                </div>
              </div>
              :
              <div></div>
            }
          </div>

          <div className="videoSection">
            <AspectRatio ratio={16 / 9}>{videoElement}</AspectRatio>
          </div>

          <div className="controlSection">
            <div className="video-audio">
              <AudioSelectButton
                isMuted={!audioEnabled}
                onClick={toggleAudio}
                onSourceSelected={setAudioDevice}
              />
              <VideoSelectButton
                isEnabled={videoTrack !== undefined}
                onClick={toggleVideo}
                onSourceSelected={selectVideoDevice}
              />
            </div>
            <div className="right">
              <ControlButton
                label="Connect"
                disabled={connectDisabled}
                icon={faBolt}
                onClick={connectToRoom}
              />
            </div>
          </div>
      </main>
    <footer>
      FlowUnion | ITMO Project
    </footer>
  </div>
  );
};
