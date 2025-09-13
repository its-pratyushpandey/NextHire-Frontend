import React, { useRef, useEffect, useState } from 'react';
import Peer from 'simple-peer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Settings, 
  Monitor, 
  MessageSquare,
  Maximize2,
  Minimize2,
  Camera,
  Users,
  FileText,
  Clock,
  Star,
  Download,
  Circle,
  StopCircle,
  Camera as CameraIcon,
  MoreVertical,
  Share2,
  Upload,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';
import { Switch } from '../ui/switch';

const VideoCall = ({ 
  isOpen, 
  onClose, 
  socket,
  userId,
  userName,
  roomId,
  recipientId,
  recipientName,
  showChatInCall,
  onToggleChatInCall
}) => {
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Professional features
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [interviewNotes, setInterviewNotes] = useState('');
  const [candidateRating, setCandidateRating] = useState(0);
  const [showInterviewPanel, setShowInterviewPanel] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [videoQuality, setVideoQuality] = useState('high');
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [callMetrics, setCallMetrics] = useState({
    latency: 0,
    packetLoss: 0,
    bandwidth: 0
  });

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const mediaRecorder = useRef();
  const recordedChunks = useRef([]);

  // Get user media with enhanced quality options
  useEffect(() => {
    if (isOpen) {
      const constraints = {
        video: {
          width: videoQuality === 'high' ? 1920 : videoQuality === 'medium' ? 1280 : 640,
          height: videoQuality === 'high' ? 1080 : videoQuality === 'medium' ? 720 : 480,
          frameRate: 30
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      navigator.mediaDevices.getUserMedia(constraints).then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
        setCallStartTime(new Date());
      }).catch(err => {
        console.error('Failed to get user media:', err);
        setConnectionStatus('failed');
      });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, videoQuality]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (callAccepted && callStartTime && !callEnded) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((new Date() - callStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callAccepted, callStartTime, callEnded]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isOpen) return;

    socket.on('callUser', ({ signal, from, name }) => {
      setReceivingCall(true);
      setCaller(from);
      setCallerSignal(signal);
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      setConnectionStatus('connected');
      connectionRef.current.signal(signal);
    });

    socket.on('callEnded', () => {
      setCallEnded(true);
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      onClose();
    });

    return () => {
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('callEnded');
    };
  }, [socket, isOpen]);

  const callUser = () => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('callUser', {
        userToCall: recipientId,
        signalData: data,
        from: userId,
        name: userName,
        roomId: roomId
      });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      setConnectionStatus('connected');
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    setConnectionStatus('connected');
    
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: caller });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    socket.emit('endCall', { to: recipientId });
    connectionRef.current?.destroy();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Professional Recording Feature
  const startRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      mediaRecorder.current = new MediaRecorder(displayStream);
      recordedChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-${roomId}-${new Date().toISOString()}.webm`;
        a.click();
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording failed:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // Save interview notes and rating
  const saveInterviewData = async () => {
    try {
      const interviewData = {
        roomId,
        candidateId: recipientId,
        recruiterId: userId,
        notes: interviewNotes,
        rating: candidateRating,
        duration: callDuration,
        timestamp: new Date().toISOString()
      };
      
      await fetch('/api/interviews/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(interviewData)
      });
      
      alert('Interview data saved successfully!');
    } catch (err) {
      console.error('Failed to save interview data:', err);
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (connectionRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = connectionRef.current.streams[0].getVideoTracks()[0];
          connectionRef.current.replaceTrack(sender, videoTrack, stream);
        }
        
        setScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          // Switch back to camera
          if (connectionRef.current && stream) {
            const videoTrack = stream.getVideoTracks()[0];
            connectionRef.current.replaceTrack(
              connectionRef.current.streams[0].getVideoTracks()[0], 
              videoTrack, 
              stream
            );
          }
        };
      } else {
        setScreenSharing(false);
        // Switch back to camera
        if (connectionRef.current && stream) {
          const videoTrack = stream.getVideoTracks()[0];
          connectionRef.current.replaceTrack(
            connectionRef.current.streams[0].getVideoTracks()[0], 
            videoTrack, 
            stream
          );
        }
      }
    } catch (err) {
      console.error('Screen sharing failed:', err);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed inset-0 z-50 bg-black/90 flex flex-col ${
            isFullscreen ? 'p-0' : 'p-4'
          }`}
        >
          {/* Header with Professional Features */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 text-white shadow-2xl">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 ring-2 ring-purple-400">
                <AvatarImage src={recipientName?.avatar} />
                <AvatarFallback>{recipientName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{recipientName}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <span className={`flex items-center gap-1 ${
                    connectionStatus === 'connected' ? 'text-green-400' : 
                    connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-400' : 
                      connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                    }`} />
                    {connectionStatus === 'connecting' && 'Connecting...'}
                    {connectionStatus === 'connected' && 'Connected'}
                    {connectionStatus === 'failed' && 'Connection failed'}
                  </span>
                  {callAccepted && (
                    <>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(callDuration)}
                      </span>
                      {isRecording && (
                        <Badge className="bg-red-600 text-white animate-pulse">
                          <Circle className="w-3 h-3 mr-1" />
                          Recording
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Professional Controls */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInterviewPanel(!showInterviewPanel)}
                    className="text-white hover:bg-white/20"
                  >
                    <FileText className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Interview Notes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`text-white hover:bg-white/20 ${isRecording ? 'text-red-400' : ''}`}
                  >
                    {isRecording ? <StopCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleChatInCall}
                    className="text-white hover:bg-white/20"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Chat</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-gray-900 border-gray-700 text-white">
                  <DropdownMenuItem className="hover:bg-gray-800">
                    <div className="flex items-center justify-between w-full">
                      <span>Video Quality</span>
                      <select 
                        value={videoQuality} 
                        onChange={(e) => setVideoQuality(e.target.value)}
                        className="bg-gray-800 rounded px-2 py-1 text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-800">
                    <div className="flex items-center justify-between w-full">
                      <span>Background Blur</span>
                      <Switch 
                        checked={backgroundBlur} 
                        onCheckedChange={setBackgroundBlur}
                      />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem onClick={saveInterviewData} className="hover:bg-gray-800">
                    <Download className="w-4 h-4 mr-2" />
                    Save Interview Data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Main Content Area with Side Panel */}
          <div className="flex-1 flex relative overflow-hidden">
            {/* Video Container */}
            <div className={`${showInterviewPanel ? 'flex-1' : 'w-full'} relative overflow-hidden transition-all duration-300`}>
              {/* Remote Video (Main) */}
              {callAccepted && !callEnded && (
                <video
                  ref={userVideo}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{
                    filter: backgroundBlur ? 'blur(2px)' : 'none'
                  }}
                />
              )}

              {/* Local Video (Picture-in-Picture) - Enhanced */}
              <div className="absolute top-4 right-4 w-64 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 group">
                <video
                  ref={myVideo}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{
                    filter: backgroundBlur ? 'blur(2px)' : 'none'
                  }}
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="w-12 h-12 text-white" />
                  </div>
                )}
                
                {/* Mini Controls Overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant={videoEnabled ? "secondary" : "destructive"}
                    onClick={toggleVideo}
                    className="w-8 h-8 p-0"
                  >
                    {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant={audioEnabled ? "secondary" : "destructive"}
                    onClick={toggleAudio}
                    className="w-8 h-8 p-0"
                  >
                    {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Call Status Overlay - Enhanced */}
              {!callAccepted && !callEnded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/80 via-purple-900/50 to-black/80">
                  <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                    <CardContent className="p-8 text-center">
                      {receivingCall && !callAccepted ? (
                        <div className="space-y-6">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center"
                          >
                            <Phone className="w-12 h-12 text-white" />
                          </motion.div>
                          <div className="text-3xl font-semibold">Incoming Call</div>
                          <div className="text-xl text-gray-300">
                            {recipientName} is calling you
                          </div>
                          <div className="flex gap-4 justify-center">
                            <Button
                              onClick={answerCall}
                              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full"
                              size="lg"
                            >
                              <Phone className="w-6 h-6 mr-2" />
                              Answer
                            </Button>
                            <Button
                              onClick={onClose}
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-8 py-4 rounded-full"
                              size="lg"
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"
                          />
                          <div className="text-2xl font-semibold">
                            Connecting to {recipientName}...
                          </div>
                          <div className="text-lg text-gray-300">
                            Please wait while we establish the connection
                          </div>
                          <Button
                            onClick={callUser}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                          >
                            <Phone className="w-5 h-5 mr-2" />
                            Start Call
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Network Quality Indicator */}
              {callAccepted && (
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge className="bg-black/50 text-white">
                    Quality: {videoQuality.charAt(0).toUpperCase() + videoQuality.slice(1)}
                  </Badge>
                  {callMetrics.latency > 0 && (
                    <Badge className={`${callMetrics.latency < 100 ? 'bg-green-600' : callMetrics.latency < 200 ? 'bg-yellow-600' : 'bg-red-600'} text-white`}>
                      {callMetrics.latency}ms
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Professional Interview Panel */}
            <AnimatePresence>
              {showInterviewPanel && (
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  className="w-96 bg-gray-900 border-l border-gray-700 text-white overflow-y-auto"
                >
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">Interview Panel</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInterviewPanel(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        ×
                      </Button>
                    </div>

                    {/* Candidate Rating */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3 text-yellow-400">Candidate Rating</h4>
                        <div className="flex items-center gap-2 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Button
                              key={star}
                              variant="ghost"
                              size="sm"
                              onClick={() => setCandidateRating(star)}
                              className="p-1 h-auto"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= candidateRating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-400'
                                }`}
                              />
                            </Button>
                          ))}
                        </div>
                        <p className="text-sm text-gray-400">
                          Rating: {candidateRating}/5 stars
                        </p>
                      </CardContent>
                    </Card>

                    {/* Interview Notes */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3 text-blue-400">Interview Notes</h4>
                        <Textarea
                          value={interviewNotes}
                          onChange={(e) => setInterviewNotes(e.target.value)}
                          placeholder="Add your interview notes here..."
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[200px] resize-none"
                        />
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3 text-green-400">Quick Actions</h4>
                        <div className="space-y-2">
                          <Button
                            onClick={saveInterviewData}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Save Interview Data
                          </Button>
                          <Button
                            onClick={() => window.open(`/candidate-profile/${recipientId}`, '_blank')}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <User className="w-4 h-4 mr-2" />
                            View Candidate Profile
                          </Button>
                          <Button
                            onClick={() => setShowParticipants(!showParticipants)}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Participant Info
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Call Statistics */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3 text-purple-400">Call Statistics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white">{formatDuration(callDuration)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Quality:</span>
                            <span className="text-white capitalize">{videoQuality}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className={`${
                              connectionStatus === 'connected' ? 'text-green-400' : 
                              connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 p-6 bg-black/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleAudio}
                  variant={audioEnabled ? "outline" : "default"}
                  size="lg"
                  className={`rounded-full w-12 h-12 ${
                    audioEnabled 
                      ? "bg-white/20 hover:bg-white/30 text-white" 
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleVideo}
                  variant={videoEnabled ? "outline" : "default"}
                  size="lg"
                  className={`rounded-full w-12 h-12 ${
                    videoEnabled 
                      ? "bg-white/20 hover:bg-white/30 text-white" 
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleScreenShare}
                  variant={screenSharing ? "default" : "outline"}
                  size="lg"
                  className={`rounded-full w-12 h-12 ${
                    screenSharing 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-white/20 hover:bg-white/30 text-white"
                  }`}
                >
                  <Monitor className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {screenSharing ? 'Stop Screen Share' : 'Share Screen'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={leaveCall}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full w-14 h-14"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>End Call</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
};

export default VideoCall;
